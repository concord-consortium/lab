class Interactive < CouchRest::Model::Base
  # attr_accessor :casted_by

  property :title,              String
  property :publicationStatus,  String

  property :models,             [String]
  property :components,         [Hash]

  timestamps!

  design do
    view :by_title
  end

end
