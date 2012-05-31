role :server, "lab2.dev.concord.org"
set  :user, "deploy"

set :rvm_type, :system
require "rvm/capistrano"

desc "Echo the server's login env for deploy user"
task :env_server do
  run "env"
end

desc "ls server"
task :ls_server do
  run "cd /var/www/app"
  run "ls -als"
end

desc "setup server"
task :setup_server do
  run "cd /var/www/app; git pull origin master"
  run "cd /var/www/app; bundle install"
  run "cd /var/www/app/server; bundle install"
  run "cd /var/www/app/server; cp config/couchdb.sample.yml config/couchdb.yml"
  run "cd /var/www/app; cp config/config_sample.yml config/config.yml"
  run "cd /var/www/app; make clean; make"
  run "cd /var/www/app; make clean-jnlp"
  run "cd /var/www/app; make server/public/jnlp"
  run "cd /var/www/app; script/build-and-deploy-jars.rb --maven-update"
end

desc "update server"
task :update_server do
  run "cd /var/www/app; bundle install"
  run "cd /var/www/app; git pull origin master"
  run "cd /var/www/app; git pull origin master"
  run "cd /var/www/app; make clean; make"
end

desc "update server"
task :update_server_jnlps do
  run "cd /var/www/app; make clean-jnlp"
  run "cd /var/www/app; make server/public/jnlp"
  run "cd /var/www/app; script/build-and-deploy-jars.rb"
end
