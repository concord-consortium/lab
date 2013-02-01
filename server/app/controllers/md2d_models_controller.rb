class Md2dModelsController < ApplicationController

  def index
    @md2d_models = Md2dModel.all
    render :json => @md2d_models.collect { |m|
      presenter(m).json_listing
    }
  end

  def show
    render :json => presenter.runtime_properties
  end

  def create
    @md2d_model = Md2dModel.new(params[:md2d_model])
    if @md2d_model.save
      render :json => @md2d_model, :status => :created, :location => @md2d_model
    else
      render :json => @md2d_model.errors, :status => :unprocessable_entity
    end
  end

  private

  def presenter(model=nil)
    model ||= Md2dModel.get(params[:id])
    Presenters::Md2dModel.new(model)
  end

end
