require 'grit'
require 'fog'

# build assets/resources for the Rails server

class BuildServerAchive < Thor
  class_option :clean, :type => :boolean, :default => false, :desc => "Regnerate the tar file"
  class_option :make, :type => :boolean, :default => false, :desc => "Regnerate all the resources with make"

  desc "upload_tarball", "Upload tar file to S3 storage"
  method_option :s3_directory, :type => :string, :default => 'lab-staging', :desc => "S3 directory containing the tar file"
  def upload_tarball
    tarball_path = create_tarball
    tarball_url = upload_file(tarball_path, options[:s3_directory])
    puts "Tar file for lab-interactive-management app created at:\n#{tarball_url}"
  end

  desc "create_tarball", "Create a tar file for the public directory"
  # method_option :clean, :type => :boolean, :default => false, :desc => "Regnerate the tar file"
  def create_tarball
    tarball = tarball_name

    FileUtils.remove_dir("tmp/#{tarball}", true) if options[:clean]
    make_server_public if options[:make]

    puts "Make tmp directory"
    FileUtils.mkdir_p('tmp')
    puts "Create tar file of public in tmp/#{tarball}"
    %x{ tar cf tmp/#{tarball} -C public . }
    "tmp/#{tarball}"
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

  def upload_file(file_path, s3_dirname)
    storage = ::Fog::Storage.new(:provider => 'AWS')
    directory = storage.directories.create(:key => s3_dirname, :public => true)
    file_name = file_path.split('/').last
    file = directory.files.create(:key => file_name,
                                  :body => File.open(file_path),
                                  :public => true)
    file.public_url
  end

end
