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
	    "padding-left": "0.5em",
	    "components": ["button2", "button3"]
	  },
	  {
	    "id": "bottom",
	    "top": "model.bottom",
	    "left": "model.left",
	    "right": "wide-right.right",
	    "padding-top": "0.5em",
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
	    "padding-left": "0.5em",
	    "width": "6em",
	    "components": [["button2"], ["button3"]]
	  },
	  {
	    "id": "bottom",
	    "top": "model.bottom",
	    "left": "model.left",
	    "right": "narrow-right.right",
	    "padding-top": "0.5em",
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
	    "padding-left": "0.5em",
	    "components": ["button2"]
	  },
		{
	    "id": "right-bottom",
	    "left": "model.right",
	    "top": "model.top + model.height/2",
	    "height": "model.height/2",
	    "padding-left": "0.5em",
	    "components": ["button3"]
	  },
	  {
	    "id": "bottom",
	    "top": "model.bottom",
	    "left": "model.left",
	    "right": "right-bottom.right",
	    "padding-top": "0.5em",
	    "components": ["button4"]
	  }
	],
	"big-top": [
		{
	    "id": "right",
	    "left": "model.right",
	    "height": "model.height",
	    "padding-left": "0.5em",
	    "components": ["button2"]
	  },
	  {
	    "id": "top",
	    "bottom": "model.top",
	    "height": "model.height/3",
	    "left": "model.left",
	    "right": "right.right",
	    "padding-bottom": "0.5em",
	    "components": ["button1"]
	  },
	  {
	    "id": "bottom",
	    "top": "model.bottom",
	    "left": "model.left",
	    "right": "right.right",
	    "padding-top": "0.5em",
	    "components": ["button4"]
	  }
	],
	"model-right": [
	  {
		  "id": "wide-left",
		  "right": "model.left",
		  "width": "model.width",
		  "height": "model.height",
		  "components": [
		    "button2",
		    "button3"
		  ]
	  },
	  {
		  "id": "bottom",
		  "top": "model.bottom",
		  "right": "model.right",
		  "left": "wide-left.left",
		  "margin-top": "0.5em",
		  "components": [
		    "button4"
	  	]
	  },
	  {
		  "id": "bottom2",
		  "top": "bottom.bottom",
		  "right": "model.right",
		  "left": "wide-left.left",
		  "components": [
		    "button1"
		  ]
	  }
	]
}