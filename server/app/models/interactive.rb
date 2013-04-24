class Interactive < BaseDataObject
  # attr_accessor :casted_by

  # see ./server/public/lab-amd/common/controllers/interactive-metadata.js

  property :title,               String
  property :subtitle,            String
  property :publicationStatus,   String
  property :staticExamplePath,   String
  property :path,                String
  property :about,               String
  property :fontScale,           Float,   :default => 1.0

  property :template,            Object
  property :layout,              Object
  property :exports,             Object
  property :components,         [Object]
  property :outputs,            [Object]
  property :filteredOutputs,    [Object]
  property :parameters,         [Object]

  validates_uniqueness_of :title, :scope => :group_id, :message => "has already been taken in this group"
  validates_presence_of :title
  validates_presence_of :path

  # collections
  # collection_of :md2ds, :class_name => "Models::Md2d"
  collection_of :interactive_models
  belongs_to    :group

  timestamps!

  design do
    view :by_title
    view :by_id
    view :by_path
  end

  alternate_id :path

  def assign_interactive_models(models)
    models.each do |im|
      interactive_model = interactive_models.find(im[:id]).first
      interactive_model.assign_from_params(im)
    end
  end

  def update_interactive_models(models)
    models.all? do |im|
      interactive_model = interactive_models.find{ |i| i.local_ref_id == im['id']}
      interactive_model.update_from_params(im)
    end
  end

end
