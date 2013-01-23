class InteractivesController < ApplicationController

  def index
    @interactives = Interactive.all
    render :json => @interactives.collect { |i|
      { "_id" => i.id, "name" => i.title, "location" => interactives_path(i) }
    }
  end

  def show
    @interactive = Interactive.get(params[:id])
    render :json => @interactive
  end

  def create
    @interactive = Interactive.new(params[:interactive])
    if @interactive.save
      render :json => @interactive, :status => :created, :location => @interactive
    else
      render :json => @interactive.errors, :status => :unprocessable_entity
    end
  end

end
