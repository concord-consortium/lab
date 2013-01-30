class Md2dModelsController < ApplicationController

  def index
    @md2d_models = Md2dModel.all
    render :json => @md2d_models.collect { |m|
      { "_id" => m.id, "name" => m.name, "location" => md2d_models_path(m) }
    }
  end

  def show
    md2d_model = Md2dModel.get(params[:id])
    view_obj     = ViewModel::Md2dModelPresenter.new(md2d_model)
    render :json => view_obj.runtime_properties
  end

  def create
    @md2d_model = Md2dModel.new(params[:md2d_model])
    if @md2d_model.save
      render :json => @md2d_model, :status => :created, :location => @md2d_model
    else
      render :json => @md2d_model.errors, :status => :unprocessable_entity
    end
  end

end
