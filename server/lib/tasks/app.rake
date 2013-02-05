namespace :app do

  JRUBY = defined?(RUBY_ENGINE) && RUBY_ENGINE == 'jruby'

  def ruby_system_command
    JRUBY ? "jruby -S" : ""
  end

  def ruby_run_command
    JRUBY ? "jruby " : "ruby "
  end

  def ruby_run_server_command
    jruby_run_command + (JRUBY ? "-J-server " : "")
  end

  namespace :import do

    desc "import MD2D models from older database 'models' in couchdb"
    task :from_models_in_couchdb => :environment do
      db_input  = CouchRest.database("http://127.0.0.1:5984/models")
      puts "\n\n*** importing md2d models from: "
      puts db_input.info.to_yaml
      db_output = CouchRest.database("http://127.0.0.1:5984/lab_development")
      db_output.recreate!
      puts "\n\n*** into: "
      puts db_output.info.to_yaml
      input_docs = db_input.documents(:include_docs => true)
      models = input_docs['rows'].find_all { |row| row["doc"]["epsilon"] }
      models.each do |model|
        doc = db_input.get(model["id"])
        doc["type"] = "Md2dModel"
        doc["name"] = model["id"]
        doc.database = db_output
        doc.save
      end
      puts "\n\n*** result: "
      puts db_output.info.to_yaml
    end

    desc "import interactives from public/examples/interactives.json"
    task :built_interactives => :environment do
      BaseDataObject.delete_everything
      parser = Parsers::InteractiveList.new(File.join(Rails.root,"public","examples","interactives","interactives.json"))
      parser.parse
      Interactive.report_extra_keys
      Models::Md2d.report_extra_keys
      Group.report_extra_keys
    end
  end
end
