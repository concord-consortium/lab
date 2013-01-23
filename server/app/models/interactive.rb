class Interactive < CouchRest::Model::Base
  # attr_accessor :casted_by

  property :title,              String
  property :publicationStatus,  String

  property :models,             [Object]
  property :components,         [Object]

  timestamps!

  design do
    view :by_title
  end

end
