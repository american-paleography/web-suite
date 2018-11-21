function loadLineImage(path, {x,y,w,h},  canvas, callback=null) {
		var vert_scale = parseFloat($('[name=line-height]').val() || 1)
		var horiz_scale = parseFloat($('[name=line-width]').val() || 1)
		y -= (vert_scale - 1)/2 * h;
		h *= vert_scale
		x -= (horiz_scale - 1)/2 * w;
		w *= horiz_scale;
		var scale = 4.5; // is this correct for all images...?
		var img = new Image();
		img.onload = function() {
			canvas.attr('width', w);
			canvas.attr('height', h);
			var ctx = canvas[0].getContext('2d');
			ctx.drawImage(img, x * scale, y * scale, w * scale, h * scale, 0, 0, w, h);
			if (callback) {
				callback();
			}
		};
		img.crossOrigin = 'Anonymous';
		img.src = path;
}



class LineSplitter {
	constructor(canvas) {
		this.fg = 3;
		this.bg = 0;

		this.source_canvas = canvas;
		this.line_width = this.source_canvas.width;
		this.line_height = this.source_canvas.height;
		this.source_ctx = this.source_canvas.getContext('2d');
		this.source_data = this.source_ctx.getImageData(0, 0, this.line_width, this.line_height);

		this.pixels = this.convert_to_greyscale();

		this.pxToGroup = new Array(this.pixels.length);

		this.groups = [];
		this.nextGroup = 1;

		this.scan_for_groups();
		this.subimages = this.split_by_groups();
	}


	map_to_words(words) {
		var chunks = this.subimages;

		// VERY naive attempt at matching images to words
		if (chunks.length > words.length) {
			// naive approach: discard the narrowest images, since they're probably a mistaken crop
			var widths = chunks.map(c => c.canvas.width).sort((a,b) => a-b);
			var excess = chunks.length - words.length;
			var trimThreshold = widths[excess];
			chunks = chunks.filter(c => c.canvas.width >= trimThreshold);
		}

		var guesses = [];
		
		for (var i = 0; i < words.length; ++i) {
			var guess = {};
			guess.text = words[i];
			guess.chunk = chunks[i];

			guesses.push(guess);
		}

		return guesses;
	}


	scan_for_groups() {
		for (var i = 0; i < this.pixels.length; ++i) {
			if (this.pixels[i] == this.bg) {
				this.pxToGroup[i] = 0;
				continue;
			}
			if (this.pxToGroup[i]) {
				continue;
			}
			this.checkSpot(i);
		}
	}

	split_by_groups() {
		var children = this.groups.map(group => {
			if (!group) {
				return;
			};
			var coords = group.map(i => {
				var x = i % this.line_width;
				var y = Math.floor(i / this.line_width);
				return [x,y];
			})
			var xCoords = coords.map(c => c[0]);
			var yCoords = coords.map(c => c[1]);

			var xMin = Math.min(...xCoords);
			var xMax = Math.max(...xCoords);
			var yMin = Math.min(...yCoords);
			var yMax = Math.max(...yCoords);

			var newCanvas = $('<canvas class="single-word">')[0];

			var padding = 3;
			xMin -= padding;
			yMin -= padding;
			xMax += padding;
			yMax += padding;

			newCanvas.height = yMax - yMin;
			newCanvas.width = xMax - xMin;
			if (newCanvas.width == 0 || newCanvas.height == 0) {
				return;
			}
			var wordImage = this.source_ctx.getImageData(xMin, yMin, newCanvas.width, newCanvas.height)
			for (var y = 0; y < newCanvas.height; ++y) {
				for (var x = 0; x < newCanvas.width; ++x) {
					var offset = x * 4 + y * newCanvas.width * 4;
					wordImage.data[offset+3] = 0;
				}
			}
			coords.forEach(c => {
				var [x,y] = c;
				x -= xMin;
				y -= yMin;
				var offset = x * 4 + y * newCanvas.width * 4;
				wordImage.data[offset+3] = 255;
			})
			newCanvas.getContext('2d').putImageData(wordImage, 0, 0)

			return  {x: xMin, y: yMin, w: xMax - xMin, h: yMax - yMin, canvas: newCanvas};
		});
		
		children = children.filter(_ => _).filter(word => word.w * word.h > 5 * 5);
		children = children.filter(word => word.h > 10 || (word.yMin > 0 && word.yMax < canvas.height));
		children.sort((a,b) => a.x - b.x);

		return children;
	}

	checkAdjacent(j, num, x, y, dx, dy) {
		x += dx;
		y += dy;
		if (x < 0 || x >= this.line_width || y < 0 || y >= this.line_height) {
			return;
		}
		j += dx;
		j += dy * this.line_width;
		if (this.pixels[j] == this.fg && this.pxToGroup[j] != num) {
			// uh, we need to bulk-update something, then... (flood fill, basically)
			if (this.pxToGroup[j] && this.pxToGroup[j] != num) {
				/*
				var oldGroup = gids[this.pxToGroup[j]];
				if (inprogCount-- > 0) {
					console.log(j, x, y, oldGroup, num, this.pxToGroup[j]);
					renderTestCanvas();
				}
				oldGroup.forEach(id => this.pxToGroup[id] = num);
				*/
			}
			this.pxToGroup[j] = num;
			this.checkSpot(j);
		}
	}

	checkSpot(i) {
		var x = i % this.line_width;
		var y = Math.floor(i / this.line_width);
		var offset = x * 4 + y * this.line_width * 4;
		var gNum;
		if (this.pxToGroup[i]) {
			gNum = this.pxToGroup[i];
		} else {
			gNum = this.nextGroup;
			this.pxToGroup[i] = gNum;
			this.groups[gNum] = [];
			this.nextGroup += 1;
		}
		this.groups[gNum].push(i);

		var rad = 3;
		for (var dx = -rad; dx <= rad; ++dx) {
			for (var dy = -rad; dy <= rad; ++dy) {
				if (dx == 0 && dy == 0) {
					continue;
				}
				this.checkAdjacent(i, gNum, x, y, dx, dy);
			}
		}
	}
	

	convert_to_greyscale() {
		var image = this.source_data;
		var rowLen = image.width * 4;
		var length = rowLen * image.height;
		var levels = [];

		var pixelCount = image.width * image.height
		var byteTotals = 0;
		for (var i = 0; i < pixelCount; ++i) {
			byteTotals += image.data[i * 4 + 0];
			byteTotals += image.data[i * 4 + 1];
			byteTotals += image.data[i * 4 + 2];
		}

		var imageAverage = byteTotals / (pixelCount * 3);


		for (var y = 0; y < image.height; ++y) {
			var minLevel = 255;
			
			for (var x = 0; x < image.width; ++x) {
				var pxBase = rowLen * y + x * 4;
				if (image.data[pxBase+3] == 0) {
					levels.push(this.bg);
				} else {
					var [r, g, b] = [image.data[pxBase+0],image.data[pxBase+1], image.data[pxBase+2]];
					var avg = (r + g + b)/3;
					var level = avg < imageAverage ? this.fg : this.bg;
					levels.push(level);
				}
			}
		}

		return levels;
	}
}

