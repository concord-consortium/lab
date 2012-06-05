class Interactive < CouchRest::Model::Base
  attr_accessor :casted_by

  property :name,                 String

  property :model,                String
  property :components,           Hash

  timestamps!

end
