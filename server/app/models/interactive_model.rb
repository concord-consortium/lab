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

  def update_from_params(model_params)
    # Don't assign the InteractiveModel's url or id for update
    assign_from_params(model_params)
    save
  end

  def assign_from_params(model_params)
    # Don't assign the InteractiveModel's url or id for update
    %w{onLoad viewOptions parameters modelOptions outputs filteredOutputs}.each do |attr|
      send("#{attr.to_sym}=", model_params[attr]) if model_params[attr]
    end
  end
end
