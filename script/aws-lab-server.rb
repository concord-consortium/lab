require 'fog'
require 'json'
require 'socket'
require 'resolv'

class AwsLabServer

  attr_reader :options, :name, :pem, :pem_path, :compute, :dns, :zone

  PEM_NAME          = CONFIG[:deploy][:pem][:name]
  PEM_PATH          = CONFIG[:deploy][:pem][:path]
  GROUP_NAME        = CONFIG[:deploy][:group_name]
  ZONE_DOMAIN       = CONFIG[:deploy][:zone_domain]
  ZONE_RECORDS_NAME = CONFIG[:deploy][:zone_records_name]

  SERVER_FORMAT_STR = "  %-20s%-30s%-14s%-20s%-16s%-30s"

  def initialize(options={})
    @options = {
      :verbose => true,
      :littlechef_path => File.join(CONFIG_PATH, 'littlechef'),
      :pem => { :name => PEM_NAME, :path => PEM_PATH },
      :server => {
        :image_id => "ami-7a59f813",
        :flavor_id => "c1.medium",
        :groups => ["lab.dev"],
        :tags => { "Name" => options[:name] }
      }
    }
    @options.merge!(options)
    @name = @options[:name]
    @pem = @options[:pem][:name]
    @pem_path = File.join(@options[:pem][:path], @pem + '.pem')
    @options[:server].merge!(:key_name =>  @pem)
    begin
      @compute = ::Fog::Compute.new({ :provider => 'AWS'})
    rescue ArgumentError => e
      if e.message[/aws_access_key_id/]
        msg = <<-HEREDOC

*** #{e.message}
*** Create the file ~/.fog with your Amazon Web Services API Access Keys

file: ~/.fog
:default:
  :aws_access_key_id: YOUR_AWS_ACCESS_KEY
  :aws_secret_access_key: YOUR_AWS_SECRET_ACCESS_KEY

        HEREDOC
        raise msg
      else
        raise
      end
    end
    @dns = ::Fog::DNS.new({ :provider => 'AWS' })
    @zone = dns.zones.find { |z| z.domain == ZONE_DOMAIN }
  end

  def setup_ssh(hostname)
    @name = @options[:name] = hostname
    add_hostname_to_ssh_config
    erase_existing_host_key
    add_new_host_key
  end

  def list
    @lab_servers = @compute.servers.all('group-name' => GROUP_NAME).reject { |ls| ls.state == 'terminated' }
    @lab_servers.sort! { |a,b| a.state <=> b.state }
    @records = @zone.records.all(:name => ZONE_RECORDS_NAME)
    puts
    puts sprintf(SERVER_FORMAT_STR, "target", "hostname", "state", "ipaddress", "ec2-id", "ec2-dns")
    puts "-" * 150
    result = @lab_servers.collect { |ls|
      dnsrecord = @records.find { |r| r.value[0] == ls.public_ip_address }
      if dnsrecord
        external_dns = dnsrecord.name
        target = find_target(external_dns.gsub(/\.$/, ""))
      else
        external_dns = "missing"
        target = { :name => "missing", :path => "missing" }
      end
      if target
        sprintf(SERVER_FORMAT_STR, target[:name], external_dns, ls.state, ls.public_ip_address, ls.id, ls.dns_name)
      else
        sprintf(SERVER_FORMAT_STR, "missing", external_dns, ls.state, ls.public_ip_address, ls.id, ls.dns_name)
      end
    }
    puts result.join("\n")
    puts
  end

  def create(hostname)
    @name = @options[:name] = hostname
    @options[:server][:tags]["Name"] = @name
    puts "*** creating new server: #{@name}" if @options[:verbose]
    @server = @compute.servers.create(@options[:server])
    puts "*** waiting for server: #{@server.id} to be ready ..." if @options[:verbose]
    @server.wait_for { ready? }
    @server.reload
    @ipaddress = aquire_elastic_ip_address
    puts "*** associating server: #{@server.id}, #{@server.dns_name} with ipaddress: #{@ipaddress}"  if @options[:verbose]
    @compute.associate_address(@server.id, @ipaddress)
    @dnsrecord = new_dns_record
    add_hostname_to_ssh_config
    erase_existing_host_key
    add_new_host_key
    write_littlechef_node
  end

  def delete(hostname)
    @name = hostname
    @ipaddress = IPSocket::getaddress(@name)
    @server = @compute.servers.all({ 'ip-address' => @ipaddress }).first
    if @server
      puts "*** terminating server: #{@server.id}, #{@server.dns_name}"  if @options[:verbose]
      @server.destroy
    end
  end

  def recreate(hostname)
    @name = @options[:name] = hostname
    @options[:server][:tags]["Name"] = @name
    self.delete(@name)
    puts "*** re-creating server: #{@name}" if @options[:verbose]
    @server = @compute.servers.create(@options[:server])
    puts "*** waiting for server: #{@server.id} to be ready ..." if @options[:verbose]
    @server.wait_for { ready? }
    @server.reload
    puts "*** associating server: #{@server.id}, #{@server.dns_name} with ipaddress: #{@ipaddress}"  if @options[:verbose]
    @compute.associate_address(@server.id, @ipaddress)
    erase_existing_host_key
    add_new_host_key
    write_littlechef_node
    cmd = "cd #{@options[:littlechef_path]} && fix node:#{name} role:lab-server"
    target = find_target(@name)
    if @options[:verbose]
      puts <<-HEREDOC

*** building-out #{@name} with littlechef role: lab-server
    #{@server.id}, #{@server.dns_name}, #{@ipaddress}
    command: #{cmd}

      HEREDOC
    end
    system(cmd)
    if @options[:verbose]
      puts <<-HEREDOC

If the littlechef install was successful run:

    cap #{target[:name]} deploy:setup

To finish deploying the application code and seting up #{@name}.

      HEREDOC
    end
  end

  def stop(hostname)
    @name = @options[:name] = hostname
    @options[:server][:tags]["Name"] = @name
    @ipaddress = IPSocket::getaddress(@name)
    @server = @compute.servers.all({ 'ip-address' => @ipaddress }).first
    if @server && @server.state == "running"
      puts "*** stopping server: #{@server.id}, #{@server.dns_name}" if @options[:verbose]
      @server.stop
    end
  end

  def start(ec2_id)
    @server = @compute.servers.get(ec2_id)
    if @server && @server.state == "stopped"
      puts "*** starting server: #{@server.id}" if @options[:verbose]
      @server.start
    end
  end

  # Add the new hostname to the local .ssh/config referencing a local copy
  # of lab-dev.pem so you can ssh into the server
  def add_hostname_to_ssh_config
    cmd = <<-HEREDOC
echo '
Host #{@name}
  User ubuntu
  IdentityFile #{@pem_path}
' >> ~/.ssh/config
    HEREDOC
    run_local_command(cmd)
  end

  # Erase any existing RSA host key in your local ~/.ssh/known_hosts
  def erase_existing_host_key
    run_local_command("ssh-keygen -R #{@name}")
  end

  # Connect once with StrictHostKeyChecking off to add the new host key
  def add_new_host_key
    run_local_command("ssh ubuntu@#{name} -o StrictHostKeyChecking=no exit")
  end

  def run_local_command(cmd)
    puts "*** running local command: #{cmd}" if @options[:verbose]
    system(cmd)
  end

  # Create a new dns record for the server and point it to the public IP address
  def new_dns_record
    puts "*** Creating new Type A DNS record: #{@name} => #{@ipaddress}" if @options[:verbose]
    @zone.records.create({ :value => @ipaddress, :name => @name, :type => 'A' })
  end

  def aquire_elastic_ip_address
    # either use an available elastic IP address or create a new one
    available_addresses = compute.addresses.all({"instance-id" => ""})
    if available_addresses.empty?
      # Allocate a new elastic ip
      elasticip = compute.allocate_address
      ipaddress = allocate.body.public_ip
    else
      # else use an available one
      ipaddress = available_addresses.last.public_ip
    end
    return ipaddress
  end

  def find_target(url)
    target = CONFIG[:deploy][:targets].find { |t| t[:url] == url }
  end

  def setup_littlechef_nodes
    @lab_servers = @compute.servers.all('group-name' => GROUP_NAME).find_all { |ls| ls.state == 'running' }
    targets = CONFIG[:deploy][:targets]
    targets.each { |t| t[:ipaddress] = Resolv.getaddress(t[:url]) }
    @lab_servers.each do |ls|
      target = targets.find { |t| t[:ipaddress] == ls.public_ip_address }
      if target
        @name = target[:url]
        @ipaddress = target[:ipaddress]
        write_littlechef_node
      end
    end
  end

  def write_littlechef_node
    @node = {
      "ipaddress"    => @ipaddress,
      "lab-hostname" => @name,
      "run_list"     => [ "role[lab-server]" ]
    }
    @json_node = JSON.pretty_generate(@node)
    # write this to the nodes/ directory in the littlechef-server repository
    node_name = "#{@name}.json"
    puts "*** updating littlechef node: #{node_name}" if @options[:verbose]
    littlechef_nodes_path = File.join(@options[:littlechef_path], 'nodes')
    FileUtils.mkdir_p littlechef_nodes_path
    File.open(File.join(littlechef_nodes_path, node_name), 'w') { |f| f.write @json_node }
  end

  def setup_capistrano_deploy_scripts
    targets = CONFIG[:deploy][:targets]
    targets.each do |target|
      @name = target[:url]
      write_capistrano_deploy_script
    end
  end

  def write_capistrano_deploy_script
    target = find_target(@name)
    deploy_script_name = "#{target[:name]}.rb"
    deploy_scripts_path = File.join(CONFIG_PATH, 'deploy')
    FileUtils.mkdir_p deploy_scripts_path
    deploy_script_path = File.join(deploy_scripts_path, deploy_script_name)
    puts "*** updating capistrano deploy script: #{deploy_script_path}" if @options[:verbose]
    deploy_script_content = <<-HEREDOC
server "#{@name}", :app, :primary => true
set :branch, "#{target[:branch]}"
    HEREDOC
    File.open(deploy_script_path, 'w') { |f| f.write deploy_script_content }
  end

end
