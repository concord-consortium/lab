class InteractivesController < ApplicationController

  def index
    interactives = Interactive.all.collect do |i| 
       Presenters::Interactive.new(i).json_listing
    end
    render :json => interactives
  end

  def show
    interactive  = Interactive.get(params[:id])
    view_obj     = Presenters::Interactive.new(interactive)
    render :json => view_obj.runtime_properties
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

end
