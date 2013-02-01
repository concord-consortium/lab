class Group < BaseDataObject
  # attr_accessor :casted_by

  property :name,       String
  property :path,       String
  property :category,   String

  alternate_id :path

  timestamps!

  design do
    view :by_name
    view :by_path
  end

end
