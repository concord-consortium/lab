class Interactive < CouchRest::Model::Base
  # attr_accessor :casted_by

  property :title,               String
  property :subtitle,            String
  property :publicationStatus,   String
  property :group_key,           String
  property :path,                String
  property :about,               String

  # collections
  property :models,             [Object]
  property :components,         [Object]

  timestamps!

  design do
    view :by_title
  end

end
