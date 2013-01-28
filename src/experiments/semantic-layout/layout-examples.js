layouts = {
	"simple": [
	  {
	    "id": "top",
	    "bottom": "model.top",
	    "components": ["button1"]
	  },
	  {
	    "id": "wide-right",
	    "left": "model.right",
	    "height": "model.height",
	    "padding-left": "1em",
	    "components": ["button2", "button3"]
	  },
	  {
	    "id": "bottom",
	    "top": "model.bottom",
	    "width": "model.width + wide-right.width",
	    "padding-top": "1em",
	    "components": ["button4"]
	  }
	],
	"narrow-right": [
		{
	    "id": "top",
	    "bottom": "model.top",
	    "components": ["button1"]
	  },
		{
	    "id": "narrow-right",
	    "left": "model.right",
	    "height": "model.height",
	    "padding-left": "1em",
	    "width": "6em",
	    "components": [["button2"], ["button3"]]
	  },
	  {
	    "id": "bottom",
	    "top": "model.bottom",
	    "width": "model.width + narrow-right.width",
	    "padding-top": "1em",
	    "components": ["button4"]
	  }
	],
	"split-right": [
		{
	    "id": "top",
	    "bottom": "model.top",
	    "components": ["button1"]
	  },
		{
	    "id": "right-top",
	    "left": "model.right",
	    "height": "model.height/2",
	    "padding-left": "1em",
	    "components": ["button2"]
	  },
		{
	    "id": "right-bottom",
	    "left": "model.right",
	    "top": "model.top + model.height/2",
	    "height": "model.height/2",
	    "padding-left": "1em",
	    "components": ["button3"]
	  },
	  {
	    "id": "bottom",
	    "top": "model.bottom",
	    "width": "model.width + right-top.width",
	    "padding-top": "1em",
	    "components": ["button4"]
	  }
	],
	"big-top": [
		{
	    "id": "top",
	    "bottom": "model.top",
	    "height": "model.height/3",
	    "width": "model.width + right.width",
	    "padding-bottom": "1em",
	    "components": ["button1"]
	  },
		{
	    "id": "right",
	    "left": "model.right",
	    "height": "model.height",
	    "padding-left": "1em",
	    "components": ["button2"]
	  },
	  {
	    "id": "bottom",
	    "top": "model.bottom",
	    "width": "model.width + right.width",
	    "padding-top": "1em",
	    "components": ["button4"]
	  }
	]
}