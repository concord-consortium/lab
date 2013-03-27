require "bundler/capistrano"
require "./script/setup"

set :stages, CONFIG[:deploy][:targets].collect { |target| target[:name] }
set :default_stage, "lab-dev"
require 'capistrano/ext/multistage'

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

def server_config_settings_yml
  # TODO: This wont work all the time....
  server = find_servers_for_task(current_task).first
  puts server.host
  {
    "production" => {
      :hostname => ENV['LAB_HOST'] || server.host || "lab.dev.concord.org"
    }
  }.to_yaml
end

namespace :deploy do


  desc "setup server"
  task :setup do
    run "cd /var/www/app; git fetch"
    run "cd /var/www/app; git reset --hard origin/#{branch}"
    run "cd /var/www/app; bundle install"
    run "cd /var/www/app/server; bundle install"
    run "cd /var/www/app/server; cp config/couchdb.sample.yml config/couchdb.yml"
    run "cd /var/www/app; cp config/config.sample.yml config/config.yml"
    run "cd /var/www/app; make clean; make"
    update_jnlps
  end

  desc "update server"
  task :update do
    run "cd /var/www/app; git checkout #{branch}; git pull origin #{branch}"
    run "cd /var/www/app; bundle install"
    run "cd /var/www/app; make public"
    webapp.make_server_settings
    webapp.import_interactives
  end


  desc "clean and update server"
  task :clean_and_update do
    run "cd /var/www/app; git fetch"
    run "cd /var/www/app; git reset --hard origin/#{branch}"
    run "cd /var/www/app; bundle install"
    run "cd /var/www/app/server; bundle install"
    run "cd /var/www/app; make clean; make"
    webapp.make_server_settings
    webapp.import_interactives
  end

  desc "clean and rebuild jars in public/jnlp dir on server"
  task :update_jnlps do
    run "cd /var/www/app; git checkout #{branch}; git pull origin #{branch}"
    run "cd /var/www/app; make jnlp-all"
  end

  desc "clean and update server and recreate jar resources"
  task :clean_and_update_all do
    clean_and_update
    update_jnlps
  end

  desc "display last commit on deployed server"
  task :status do
    run "cd /var/www/app; git log -1"
  end

  namespace :webapp do
    desc "update the rails server"
    task :update_rails_server do
      run "cd /var/www/app/server; git fetch; git reset --hard origin/#{branch}"
      run "cd /var/www/app/server; bundle install"
    end

    desc "generate settings.yml for the rails server"
    task :make_server_settings do
      put server_config_settings_yml, "/var/www/app/server/config/settings.yml"
      run "cd /var/www/app/server; cp config/couchdb.sample.yml config/couchdb.yml"
      run "touch /var/www/app/server/tmp/restart.txt"
    end

    desc "import generated model and interactive resources into the rails server"
    task :import_interactives do
      run "cd /var/www/app/server; RAILS_ENV=production bundle exec rake app:import:built_interactives"
      run "touch /var/www/app/server/tmp/restart.txt"
    end

    desc "restart the rails app"
    task :restart do
      run "touch /var/www/app/server/tmp/restart.txt"
    end
  end
end
