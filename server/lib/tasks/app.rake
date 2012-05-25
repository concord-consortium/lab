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

    desc "import MD2D models from 'models' database in couchdb"
    task :from_models_in_couchdb => :environment do
      db_input  = CouchRest.database("http://127.0.0.1:5984/models")
      CouchRest.database("http://127.0.0.1:5984/lab_development").delete!
      Md2dModel.database.delete!
      input_docs = db_input.documents(:include_docs => true)
      models = input_docs['rows'].find_all{|row| row["doc"]["epsilon"]}
      models.each do |model|
        doc = db_input.get(model["id"])
        doc["type"] = "Md2dModel"
        doc["name"] = model["id"]
        # doc.database = Md2dModel.database
        puts doc["name"]
        # doc.save(true)
        m = Md2dModel.new(doc['body'])
        m.id = doc.id
        m.save
      end
    end

  end
end
