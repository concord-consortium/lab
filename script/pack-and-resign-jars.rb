#!/usr/bin/env ruby
require_relative 'setup.rb'
require 'optparse'

@nosign = @trusted_library = @cmd_logging = false

opts = OptionParser.new
opts.on("--nosign")	{ |val| @nosign = true }
opts.on("--trusted-library") { |val| @trusted_library = true }
opts.on("--verbose") { |val| @cmd_logging = true }
@regex = opts.parse(ARGV)[0]

LIBRARY_MANIFEST_PATH    = File.join(CONFIG_PATH, 'manifest-library')
JAR_MANIFEST_PATH        = File.join(CONFIG_PATH, 'manifest-jar')
SIGNED_JAR_MANIFEST_PATH = File.join(CONFIG_PATH, 'manifest-signed-jar')
JAR_SERVICES_DIR         = File.join(CONFIG_PATH, 'services')

def cmd(command)
  if @cmd_logging
    cmd_log = command.gsub(/-storepass\s+\S+/, '-storepass ******')
    puts "\n    #{cmd_log}\n"
  end
  system(command)
end

keystore = ""

if CONFIG[:keystore_path]
  keystore = `keytool -list -v -keystore #{File.join(PROJECT_ROOT, CONFIG[:keystore_path])} -storepass #{CONFIG[:password]}`
else
  keystore = `keytool -list -v -storepass #{CONFIG[:password]}`
end
keystore_expires = keystore[/until:\s(.*)/, 1]

if @nosign
  puts <<-HEREDOC

*** GENERATING UNSIGNED RESOURCE

  HEREDOC
else
  puts <<-HEREDOC

*** GENERATING SIGNED RESOURCE

    Java Code Siging Certificate Keystore:

      Alias:   #{CONFIG[:alias]}
      Expires: #{keystore_expires}

  HEREDOC
end

jars = Dir["#{PUBLIC_ROOT}/jnlp/**/*.jar"]
if @regex
  jars = jars.grep(/#{@regex}/)
end
puts "\nprocessing #{jars.length} jars ...\n"
jars.each do |jar_path|
  path = File.dirname(jar_path)
  name = File.basename(jar_path)
  library = name[/-nar(__V.*?|)\.jar/]
  Dir.chdir(path) do
    puts "\nworking in dir: #{path}\n"
    unless @nosign
      puts "\nremoving content in meta-inf directory in:\n  #{path}/#{name}"
      cmd("zip -d #{name} META-INF/\*")
    end
    if library || @trusted_library
      puts "\ncreating 'Trusted-Library: true' manifest in:\n  #{path}/#{name}"
      cmd("jar umf #{LIBRARY_MANIFEST_PATH} #{name}")
    else
      # tip from AppletFriendlyXMLDecoder.java to fix spurious requests
      # in applets to: meta-inf/services/javax.xml.parsers.SAXParserFactory
      puts "\nadding META-INF/services directory to: #{path}/#{name}"
      cmd("jar uf #{name} -C #{CONFIG_PATH} META-INF")
      if @nosign
        # system("jar umf #{JAR_MANIFEST_PATH} #{name}")
      else
        puts "\ncreating 'Trusted-Library: true' manifest in:\n  #{path}/#{name}"
        cmd("jar umf #{SIGNED_JAR_MANIFEST_PATH} #{name}")
      end
    end
    #
    # 
    # Packing and unpacking MW can produce siging errors -- example:
    #   jarsigner: java.lang.SecurityException: SHA1 digest error for 
    #     org/concord/mw2d/models/AtomicModel$8.class
    #
    # So I am telling pack200 to create just 1 large segment file during processing.
    #
    # From the pack200 man page:
    #
    #    Larger archive segments result in less fragmentation and  better 
    #    compression, but processing them requires more memory.
    #
    # see: Digital signatures are invalid after unpacking
    #      http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=5078608
    #
    puts "\nrepacking:\n  #{path}/#{name}"
    cmd("pack200 --repack --segment-limit=-1 #{name}")
    unless @nosign
      puts "\nsigning:\n  #{path}/#{name}"
      if CONFIG[:keystore_path]
        cmd("jarsigner -storepass #{CONFIG[:password]} -keystore #{File.join(PROJECT_ROOT, CONFIG[:keystore_path])}  #{name} #{CONFIG[:alias]}")
      else
        cmd("jarsigner -storepass #{CONFIG[:password]} #{name} #{CONFIG[:alias]}")
      end
      puts "\nverifying:\n  #{path}/#{name}\n"
      cmd("jarsigner -verify #{name}")
    end
    unless library
      puts "\ncreating:\n  #{path}/#{name}.pack.gz"
      cmd("pack200  --segment-limit=-1 #{name}.pack.gz  #{name}")
      unless @nosign
        puts "\nunpacking and verifying:\n  #{path}/#{name}.pack.gz\n"
        FileUtils.rm("#{PROJECT_ROOT}/packgz-extraction-#{name}") if File.exists?("#{PROJECT_ROOT}/packgz-extraction-#{name}")
        system("unpack200 #{path}/#{name}.pack.gz #{PROJECT_ROOT}/packgz-extraction-#{name}")
        if system("jarsigner -verify #{PROJECT_ROOT}/packgz-extraction-#{name}")
          system("rm -f #{PROJECT_ROOT}/packgz-extraction-#{name}")
        else
          puts "\n*** error with signature:\n  #{PROJECT_ROOT}/packgz-extraction-#{name} \n"
        end
      end
    end
  end
  puts
end
