class Interactive < BaseDataObject
  # attr_accessor :casted_by

  property :title,               String
  property :subtitle,            String
  property :publicationStatus,   String
  property :group_key,           String
  property :path,                String
  property :about,               String

  property :layout,              Object

  # collections
  property :components,         [Object]
  collection_of :md_2d_models

  timestamps!

  design do
    view :by_title
    view :by_id
    view :by_path
  end

  alternate_id :path

end
