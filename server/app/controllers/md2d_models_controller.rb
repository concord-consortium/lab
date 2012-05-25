class Md2dModelsController < ApplicationController

  def index
    @md2d_models = Md2dModel.all
    render :json => @md2d_models.collect { |m|
      { "_id" => m.id, "name" => m.name, "location" => md2d_models_path(m) }
    }
  end

  def show
    @md2d_model = Md2dModel.get(params[:id])
    render :json => @md2d_model
  end

  def create
    debugger
    @md2d_model = Md2dModel.new(params[:md2d_model])
    if @md2d_model.save
      render :json => @md2d_model, :status => :created, :location => @md2d_model
    else
      render :json => @md2d_model.errors, :status => :unprocessable_entity
    end
  end

end
