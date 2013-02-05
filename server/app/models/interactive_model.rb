class InteractiveModel < BaseDataObject

  property :onLoad,          Object
  property :viewOptions,     Object
  property :parameters,      Object
  property :modelOptions,    Object
  property :outputs,         Object
  property :filteredOutputs, Object

  # collections
  belongs_to    :interactive
  # TODO:  Polymorphic models...
  belongs_to    :md2d, :class_name => "Models::Md2d"

  timestamps!

  design do
    view :by_id
    view :by_interactive_id
    view :by_md2d_id
  end

end
