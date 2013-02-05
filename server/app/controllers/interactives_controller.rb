class InteractivesController < ApplicationController

  def index
    interactives = Interactive.all.collect do |i|
       presenter(i).json_listing
    end
    render :json => interactives
  end

  def show
    render :json => presenter.runtime_properties
  end

  def group_list
    interactives = Interactive.all.collect do |i|
       presenter(i).group_listing
    end
    render :json => interactives
  end

  def create
    @interactive = Interactive.new(params[:interactive])
    if @interactive.save
      render({
        :json     => @interactive,
        :status   => :created,
        :location => interactive_path(@interactive)
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
    model ||= Interactive.get(params[:id])
    Presenters::Interactive.new(model)
  end

end
