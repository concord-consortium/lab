module Models
  class Md2dsController < ApplicationController

    def index
      @md2ds = Models::Md2d.all
      render :json => @md2ds.collect { |m|
        presenter(m).json_listing
      }
    end

    def show
      render :json => presenter.runtime_properties
    end

    def create
      @md2d = Models::Md2d.new(params[:md2d])
      if @md2d.save
        render :json => @md2d, :status => :created, :location => @md2d
      else
        render :json => @md2d.errors, :status => :unprocessable_entity
      end
    end

    def update
      @md2d_model = Models::Md2d.find(params['id'])

      if @md2d_model.update_attributes(params[:md2d])
        render({
                 :json     => presenter(@m2d_model).runtime_properties,
                 :status   => :created,
                 :location => models_md2d_path(@md2d_model)
               })
      else
        render({
                 :json => @interactive.errors,
                 :status => :unprocessable_entity
               })
        
      end
    end

    private

    def presenter(model=nil)
      model ||= Models::Md2d.get(params[:id])
      Presenters::Models::Md2d.new(model)
    end

  end
end
