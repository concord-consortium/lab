App::Application.config.middleware.insert_before(Rack::Lock, Rack::Rewrite) do
  r301   '/examples/interactives/interactives.html',  '/interactives.html'
  r301   '/examples/interactives/embeddable.html',  '/embeddable.html'
end
