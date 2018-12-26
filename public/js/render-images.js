function setupPolygonCutter(container_selector, source, scale, rot) {
	rot = -rot;
	window.onerror = function(msg, file, line, offset, err) {
		var out = err.stack;

		alert(out);
	};

	if (typeof source == 'string') {
		source = $(source)[0];
	}

	if (source instanceof Image) {
		function drawTo(canvas) {
			var right = source.width * scale;
			var bottom = source.height * scale;

			var corners = [
				{x: 0, y: 0},
				{x: right, y: 0},
				{x: right, y: bottom},
				{x: 0, y: bottom}
			];

			var c = Math.cos(-rot);
			var s = Math.cos(-rot);

			var rotCorners = corners.map(p => ({
				x: p.x * c - p.y * s,
				y: p.y * c + p.x * s,
			}))

			alert(JSON.stringify(rotCorners));

			var xCoords = rotCorners.map(p => p.x).sort();
			var yCoords = rotCorners.map(p => p.y).sort();

			var width = xCoords.pop() - xCoords[0];
			var height = yCoords.pop() - yCoords[0];

			var cx = bottom * Math.sin(rot);

			ui.canvas.width = canvas.width = width;
			ui.canvas.height = canvas.height = height;
			$(container_selector).width(width + 50);
			$(container_selector).height(height + 50);

			var xdiff = (width - right)/(2);
			var ydiff = (height - bottom)/(2);
			//alert(xdiff);

			[ui.ctx, bg.ctx].forEach(ctx => {
				ctx.scale(scale, scale);
				ctx.translate(xdiff, -ydiff);
				ctx.translate(width/2, height/2);
				ctx.rotate(rot);
				ctx.translate(-width/2, -height/2);
			})

			canvas.getContext('2d').drawImage(source, 0, 0);
		}
	} else if (source instanceof HTMLCanvasElement) {
		function drawTo(canvas) {
			var width = source.width * scale;
			var height = source.height * scale;
			ui.canvas.width = canvas.width = width;
			ui.canvas.height = canvas.height = height;
			$(container_selector).width(width + 50);
			$(container_selector).height(height + 50);

			ui.ctx.scale(scale, scale);
			bg.ctx.scale(scale, scale);

			bg.ctx.rotate(rot);
			ui.ctx.rotate(rot);
			
			var imgData = source.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
			canvas.getContext('2d').putImageData(imgData, 0, 0);
		}
	} else {
		throw new Error("Must provide a Canvas or Image as the source");
	}

	var base = $(container_selector);


	var ui = {};
	ui.canvas = base.find('#ui-overlay')[0];
	ui.ctx = ui.canvas.getContext('2d');
	ui.points = [];
	ui.segmentStarts = [];

	var buffer = {};
	buffer.canvas = base.find(/*'<canvas>'*/ '#buffer')[0];
	buffer.canvas.width = ui.canvas.width;
	buffer.canvas.height = ui.canvas.height;
	buffer.ctx = buffer.canvas.getContext('2d');

	var bg = {};
	bg.canvas = base.find('#bg-canvas')[0];
	bg.ctx = bg.canvas.getContext('2d');

	var output = {};
	output.canvas = $('#output-canvas')[0];
	output.ctx = output.canvas.getContext('2d');

	ui.canvas.addEventListener('mousedown', doTouch);
	ui.canvas.addEventListener('touchstart', doTouch);

	ui.canvas.addEventListener('mousemove', doMove);
	ui.canvas.addEventListener('touchmove', doMove);

	ui.canvas.addEventListener('mouseup', doTouchEnd);
	ui.canvas.addEventListener('touchend', doTouchEnd);

	var touching = false;

	function isLeft(ev) {
		if (ev.changedTouches) {
			return true;
		} else {
			return ev.button == 0;
		}
	}

	function doTouch(ev) {
		if (!isLeft(ev)) {
			return;
		}

		var spot = ev.changedTouches ? ev.changedTouches[0] : ev;
		var pt = eventToPoint(spot);
		if (pt[0] && pt[1]) {
			touching = true;
			addSavePoint();
			addPoint(pt)
			ev.target.focus();
			ev.preventDefault();
		}
	}

	function doMove(ev) {
		if (!touching) {
			return;
		}

		var spot = ev.changedTouches ? ev.changedTouches[0] : ev;
		var pt = eventToPoint(spot);
		if (pt[0] && pt[1]) {
			addPoint(pt)
			ev.preventDefault();
		}
	}

	function doTouchEnd(ev) {
		if (!isLeft(ev)) {
			return;
		}

		touching = false;
		drawPolygon();
		//cutPolygon();
	}

	function addSavePoint() {
		ui.segmentStarts.push(ui.points.length);
	}
	
	drawTo(bg.canvas);

	function eventToPoint(ev) {
		console.log(ev);
		var rect = ev.target.getBoundingClientRect();
		return [
			ev.clientX - rect.left,
			ev.clientY - rect.top,
		].map(c => c && c / scale);
	}

	$('#test-cut').on('click', function() {
		addPoint([10, 200]);
		addPoint([200, 10]);
		addPoint([200, 200]);
	})

	function addPoint(p) {
		ui.points.push(p);
		drawPolygon();
	}

	function drawPrecutAreas() {
		if (ui.precut) {
			ui.precut.forEach(poly => {
				ui.ctx.beginPath();

				ui.ctx.strokeStyle = poly.line_id ? 'green' : 'yellow';
				ui.ctx.lineWidth = 3;
				
				ui.ctx.moveTo(...poly.points[poly.points.length-1]);
				poly.points.forEach(point => {
					ui.ctx.lineTo(...point);
				});

				ui.ctx.stroke();
			})
		}
	}

	function drawPolygon() {
		ui.ctx.clearRect(0, 0, ui.canvas.width / scale, ui.canvas.height / scale);

		drawPrecutAreas();

		if (!ui.points.length) {
			return;
		}

		ui.ctx.lineWidth = 1 / scale;
		ui.ctx.strokeStyle = 'black';

		ui.ctx.beginPath()
		ui.ctx.moveTo(...ui.points[ui.points.length-1]);
		ui.points.forEach(point => {
			ui.ctx.lineTo(...point);
		});

		ui.ctx.stroke();

		(function drawControlPoints() {
			ui.ctx.globalAlpha = 0.15;

			var rad = 10 / scale;

			ui.ctx.beginPath();
			ui.ctx.fillStyle = 'red';
			ui.ctx.arc(...ui.points[0], rad, 0, 2 * Math.PI);
			ui.ctx.fill();
			ui.ctx.stroke();

			ui.ctx.beginPath();
			ui.ctx.fillStyle = 'orange';
			ui.ctx.arc(...ui.points[ui.points.length-1], rad, 0, 2 * Math.PI);
			ui.ctx.fill();
			ui.ctx.stroke();


			ui.ctx.beginPath();
			ui.ctx.fillStyle = 'green';
			ui.segmentStarts.forEach(index => {
				ui.ctx.moveTo(...ui.points[index]);
				ui.ctx.arc(...ui.points[index], rad/2, 0, 2 * Math.PI);
			})
			ui.ctx.fill();
			ui.ctx.stroke();

			ui.ctx.globalAlpha = 1;
		})()
	}

	function cutPolygon() {
		var rect = getBoundingBox(ui.points);

		if (!rect[2] || !rect[3]) {
			return false;
		}

		buffer.canvas.width = bg.canvas.width;
		buffer.canvas.height = bg.canvas.height;

		buffer.ctx = buffer.canvas.getContext('2d');
		buffer.ctx.globalCompositeOperation = 'source-over';

		buffer.ctx.putImageData(bg.ctx.getImageData(...rect), rect[0], rect[1]);

		buffer.ctx.globalCompositeOperation = 'destination-in';
		buffer.ctx.beginPath();
		buffer.ctx.moveTo(...ui.points[ui.points.length-1]);
		ui.points.forEach(point => {
			buffer.ctx.lineTo(...point);
		})

		buffer.ctx.fill();

		var clipped = buffer.ctx.getImageData(...rect);

		output.canvas.width = clipped.width;
		output.canvas.height = clipped.height;

		output.ctx.putImageData(clipped, 0, 0);

		return true;
	}

	function getBoundingBox(points) {
		var x = points.map(a => a[0]).sort((a,b) => a-b); // um, why is the default sort string-y?
		var y = points.map(a => a[1]).sort((a,b) => a-b);
		console.log(points, x, y);
		var left = x[0];
		var top = y[0];
		
		var width = x[x.length-1] - left;
		var height = y[y.length-1] - top;

		return [left, top, width, height];
	}


	function getPolygonInfo() {
		var points = ui.points.slice();
		var undo_indices = ui.segmentStarts.slice();

		// do NOT send the image itself - it's way too large to POST to something

		return {points, undo_indices};
	}

	function undoPolygonSegment() {
		if (ui.segmentStarts.length > 0) {
			var from = ui.segmentStarts.pop();
			ui.points.splice(from);
		}
		drawPolygon();
		//cutPolygon();
	}

	function setPrecutAreas(cuts) {
		ui.precut = cuts;
		drawPolygon();
	}

	function incScale(amount) {
		scale += (amount * scale);
		if (scale < 0.1) {
			scale = 0.1;
		}
		if (scale > 10) {
			scale = 10;
		}

		drawTo(bg.canvas);
		drawPolygon();
	}

	function getScale() {
		return scale;
	}

	return {
		getter: getPolygonInfo,
		undo: undoPolygonSegment,
		setPrecuts: setPrecutAreas,
		incScale,
		getScale,
	};
}

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
			scale = img.height / 1000;
			canvas.attr('width', w);
			canvas.attr('height', h);
			var ctx = canvas[0].getContext('2d');
			ctx.drawImage(img, x * scale, y * scale, w * scale, h * scale, 0, 0, w, h);
			if (callback) {
				callback(x, y);
			}
		};
		img.crossOrigin = 'Anonymous';
		img.src = path;
}

function highlightLineBoundaries(path, lines, canvas, callback=null) {
		var scale = 4.5; // is this correct for all images...?
		var img = new Image();
		img.onload = function() {
			scale = img.height / 1000;
			canvas.attr('width', img.width);
			canvas.attr('height', img.height);
			var ctx = canvas[0].getContext('2d');
			ctx.drawImage(img, 0, 0);
			
			ctx.beginPath();
			ctx.strokeStyle = 'red';
			ctx.lineWidth = 3;
			lines.forEach(({x,y,w,h}) => {
				x *= scale;
				y *= scale;
				w *= scale;
				h *= scale;
				ctx.moveTo(x,y);
				ctx.lineTo(x+w, y);
				ctx.lineTo(x+w, y+h);
				ctx.lineTo(x, y+h);
				ctx.lineTo(x, y);
			})
			ctx.stroke();

			ctx.textBaseline = 'top';
			ctx.fillStyle = 'red';
			ctx.font = '40px sans-serif';
			lines.forEach(({x,y,w,h}, i) => {
				x *= scale;
				y *= scale;
				w *= scale;
				h *= scale;

				var offset = 2 * scale;

				var lineText = "L " + (i+1);

				ctx.textAlign = 'left';
				ctx.fillText(lineText, x + offset, y + offset);

				ctx.textAlign = 'right';
				ctx.fillText(lineText, x + w - offset, y + offset);
			})

			if (callback) {
				callback(x, y);
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

