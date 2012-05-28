#!/usr/bin/env ruby
require_relative 'setup.rb'

RESIGN_JARS_CMD    = File.join(SCRIPT_PATH, 'pack-and-resign-jars.rb')
SENSOR_NATIVE_PATH = File.join(JAVA_ROOT, 'sensor-native')

%w{macosx-i386 macosx-x86_64 win32}.each do |arch|
  source         = File.join(SENSOR_NATIVE_PATH, 'native-archives', "vernier-goio-#{arch}-nar.jar")
  to_path        = File.join(JNLP_ROOT, 'org', 'concord', 'sensor', 'vernier', 'vernier-goio')
  jars           = Dir["#{to_path}/*#{arch}*__*.jar"]
  if jars.empty?
    new_jar_index = 1
  else
    new_jar_index  = jars.sort.last[/-(\d+)\.jar$/, 1].to_i + 1
  end
  new_jar_index  = Dir["#{to_path}/*#{arch}*__*.jar"].sort.last[/-(\d+)\.jar$/, 1].to_i + 1
  version_str    = '__V1.5.0-' + TIMESTAMP + "-#{new_jar_index}"
  versioned_name = "vernier-goio-#{arch}-nar" + version_str + '.jar'
  destination    = File.join(to_path, versioned_name)
  if File.exists?(source)
    FileUtils.mkdir_p(to_path)
    FileUtils.cp(source, destination)
    system("ruby #{RESIGN_JARS_CMD} #{versioned_name}")
  end
end
