required_version = "1.9.3"
required_patchlevel = 194

# This could be generalized and renamed to check
# for more build dependencies such as node ...

if RUBY_VERSION != required_version && RUBY_PATCHLEVEL != required_patchlevel
  puts "*** building Lab project requires installation of Ruby #{required_version}-p#{required_patchlevel}"
  puts "*** You have Ruby #{RUBY_VERSION}-p#{RUBY_PATCHLEVEL} ..."
  exit 1
end

exit 0
