class Group < CouchRest::Model::Base
  # attr_accessor :casted_by

  property :name,       String
  property :path,       String
  property :category,   String
  
  timestamps!

  design do
    view :by_name
  end

end
