class Interactive < CouchRest::Model::Base
  # attr_accessor :casted_by

  property :title,               String
  property :subtitle,            String
  property :publicationStatus,   String
  property :group_key,           String
  property :path,                String
  property :about,               String

  # track imorted (from buld process)
  property :from_import,         TrueClass, :default => true
  property :layout,              Object
  
  # collections
  property :models,             [Object]
  property :components,         [Object]
  collection_of :md_2d_models

  timestamps!

  design do
    view :by_title
    view :by_id
  end


  def self.delete_example_imports
    self.all.select { |a| a.from_import? each {|i| i.destroy } }
  end
end
