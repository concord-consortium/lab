require 'grit'

# build assets/resources for the Rails server

class BuildServerAchive < Thor
  class_option :clean, :type => :boolean, :default => false, :desc => "Regnerate the tar file"
  class_option :make, :type => :boolean, :default => false, :desc => "Regnerate all the resources with make"

  desc "update_rails_server", "Update the rails server working dir with lab resoures"
  def update_rails_server
    # lab server repo should be a sibling dir
    rs_working_dir = "../lab-interactive-management"

    # see if we have rails server repo checked out in sibling dir
    if !File.directory?('rs_working_dir')
      # TODO: checkout rails server repo
      # clone repo
      # %{ git clone }
    end

    tarball = tarball_name
    if !File.exist?("tmp/#{tarball}")
      create_tarball
    end
    puts "Lets unpack tarball, #{tarball}, to #{rs_working_dir}"
    %x{ tar xf tmp/#{tarball}  -C ../lab-interactive-management/public }
    # TODO: make this optional
    # %x{rm -rf tmp/#{tarball} }
  end

  desc "create_tarball", "create a tar file for the server/public directory"
  # method_option :clean, :type => :boolean, :default => false, :desc => "Regnerate the tar file"
  def create_tarball
    tarball = tarball_name

    FileUtils.remove_dir("tmp/#{tarball}", true) if options[:clean]
    make_server_public if options[:make]

    puts "Make tmp directory"
    FileUtils.mkdir_p('tmp')
    puts "Create tar file of server/public in tmp/#{tarball}"
    %x{ tar cf tmp/#{tarball} -C server/public . }
  end

  #TODO: find out why this is soooo slow.
  desc "make_server_public", "generate the server public directory contents"
  def make_server_public
    puts "Running make clean"
    %x{ make clean }
    puts "Running make to generate the server/public contents"
    %x{ make > /dev/null }
  end

  private

  def tarball_name
    commit_hash = %x{git log -1 --format=%h }
    tarball = "lab_#{commit_hash.chomp}.tar.gz"
  end
end
