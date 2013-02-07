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

  # preserve the order of the groups from the file they were imported from.
  def self.correct_order
    self.all.sort_by(&:created_at)
  end
end
