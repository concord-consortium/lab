require './script/setup.rb'
require './script/aws-lab-server'

class Cloud < Thor
  desc "list", "list existing servers"
  def list
    aws = AwsLabServer.new
    aws.list
  end

  desc "list_targets", "list existing deploy targets"
  def list_targets
    targets = CONFIG[:deploy][:targets]
    format_string = "  %-24s%-30s%-30s"
    puts
    puts "  Deploy Targets"
    puts sprintf(format_string, *targets[0].keys)
    puts "-" * 90
    targets.each do |target|
      puts sprintf(format_string, *target.values)
    end
    puts
  end

  desc "setup", "setup capistrano deploy tasks and littlechef nodes using targets in config/config.yml"
  def setup
    aws = AwsLabServer.new
    aws.setup_capistrano_deploy_scripts
    aws.setup_littlechef_nodes
    aws.setup_ssh
  end

  desc "create (hostname)", "create a new server instance using this hostname"
  def create(hostname)
    aws = AwsLabServer.new
    aws.create(hostname)
  end

  desc "recreate (hostname)", "recreate a new server instance for this hostname by destroying and rebuilding an existing server"
  def recreate(hostname)
    aws = AwsLabServer.new
    aws.recreate(hostname)
  end

  desc "delete (hostname)", "delete an existing server instance running at this hostname"
  def delete(hostname)
    aws = AwsLabServer.new
    aws.delete(hostname)
  end

  desc "stop (reference)", "stop a running existing server instance at this hostname or ec2-id"
  def stop(reference)
    aws = AwsLabServer.new
    aws.stop(reference)
  end

  desc "start (ec2_id)", "start a stopped existing server instance at this hostname"
  def start(ec2_id)
    aws = AwsLabServer.new
    aws.start(ec2_id)
  end

  desc "find_dns_record (hostname)", "find dns record for hostname"
  def find_dns_record(hostname)
    aws = AwsLabServer.new
    record = aws.find_dns_record(hostname)
    puts "\n*** Record: #{record.inspect}"
  end

  desc "update_dns_record hostname ipaddress", "updating IP address for DNS record hostname to ipaddress"
  def update_dns_record(hostname, ipaddress)
    aws = AwsLabServer.new
    record = aws.update_dns_record(hostname, ipaddress)
  end

  desc "setup_ssh (hostname)", "setup ssh configuration for communication to hostname"
  def setup_ssh(hostname)
    aws = AwsLabServer.new
    aws.setup_ssh(hostname)
  end

end