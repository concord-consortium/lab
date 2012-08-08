require "bundler/capistrano"
require "./script/setup"

set :stages, CONFIG[:deploy][:targets].collect { |target| target[:name] }
set :default_stage, "lab-dev"
require 'capistrano/ext/multistage'

# role :server, "lab2.dev.concord.org"
set  :user, "deploy"

set :rvm_type, :system
require "rvm/capistrano"

desc "Echo the server's login env for deploy user"
task :env_server do
  run "echo *** SERVER IP: `wget -qO- http://instance-data/latest/meta-data/public-ipv4`"
  run "env"
end

desc "ls server"
task :ls_server do
  run "cd /var/www/app"
  run "ls -als"
end

namespace :deploy do

  desc "setup server"
  task :setup do
    run "cd /var/www/app; git checkout master; git pull origin master"
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
  task :update do
    run "cd /var/www/app; git checkout master; git pull origin master"
    run "cd /var/www/app; bundle install"
    run "cd /var/www/app; make public"
  end

  desc "clean and update server"
  task :clean_and_update do
    run "cd /var/www/app; git checkout master; git pull origin master"
    run "cd /var/www/app; bundle install"
    run "cd /var/www/app; make clean; make"
  end

  desc "update public/jnlp dir on server"
  task :update_jnlps do
    update
    run "cd /var/www/app; make clean-jnlp"
    run "cd /var/www/app; make server/public/jnlp"
    run "cd /var/www/app; script/build-and-deploy-jars.rb"
  end

  desc "display last commit on deployed server"
  task :status do
    run "cd /var/www/app; git log -1"
  end

end