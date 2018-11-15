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




const bg = 0;
const fg = 3;

function render_debug_info_for_line(canvas) {
	var image_data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
	var px = convert_to_greyscale(image_data);
	
	var newImage = canvas.getContext('2d').createImageData(image_data);
	console.log(newImage.width, newImage.height);

	var source_ctx = canvas.getContext('2d');

	var colors = [
		[0,0,0],
		[255,0,0],
		[0,255,0],
		[0,0,255],
		[180,0,180],
		//[180,180,0],
		//[0,180,180],
		//[120,120,120],
	]
	var groups = new Array(px.length);
	var gids = [];
	var nextGroup = 1;

	var inprogCount = 5;
	function checkAdjacent(j, num, x, y, dx, dy) {
		x += dx;
		y += dy;
		if (x < 0 || x >= newImage.width || y < 0 || y >= newImage.height) {
			return;
		}
		j += dx;
		j += dy * newImage.width;
		if (px[j] == fg && groups[j] != num) {
			// uh, we need to bulk-update something, then... (flood fill, basically)
			if (groups[j] && groups[j] != num) {
				/*
				var oldGroup = gids[groups[j]];
				if (inprogCount-- > 0) {
					console.log(j, x, y, oldGroup, num, groups[j]);
					renderTestCanvas();
				}
				oldGroup.forEach(id => groups[id] = num);
				*/
			}
			groups[j] = num;
			checkSpot(j);
		}
	}
	function checkSpot(i) {
		var x = i % newImage.width;
		var y = Math.floor(i / newImage.width);
		var offset = x * 4 + y * newImage.width * 4;
		var gNum;
		if (groups[i]) {
			gNum = groups[i];
		} else {
			gNum = nextGroup;
			groups[i] = gNum;
			gids[gNum] = [];
			nextGroup += 1;
		}
		gids[gNum].push(i);

		var rad = 3;
		for (var dx = -rad; dx <= rad; ++dx) {
			for (var dy = -rad; dy <= rad; ++dy) {
				if (dx == 0 && dy == 0) {
					continue;
				}
				checkAdjacent(i, gNum, x, y, dx, dy);
			}
		}
	}
	for (var i = 0; i < px.length; ++i) {
		if (px[i] == bg) {
			groups[i] = 0;
			continue;
		}
		if (groups[i]) {
			continue;
		}
		checkSpot(i);
	}

	renderTestCanvas();

	function renderTestCanvas() {
		for (var i = 0; i < px.length; ++i) {
			var x = i % newImage.width;
			var y = Math.floor(i / newImage.width);
			var offset = x * 4 + y * newImage.width * 4;
			if (px[i] == fg && groups[i]) {
				var color = colors[groups[i] % colors.length];
				newImage.data[offset+0] = color[0];
				newImage.data[offset+1] = color[1];
				newImage.data[offset+2] = color[2];
			} else {
				newImage.data[offset+0] = 255
				newImage.data[offset+1] = 255
				newImage.data[offset+2] = 255
			}
			newImage.data[offset+3] = 255;
		}

		console.log(px);

		var holder = $('<p style="border-bottom: 1px dotted black">')[0];
		holder.innerText = "flood-fill debug render:";
		var newCanvas = $('<canvas style="margin:5px;" class="single-word">')[0];
		newCanvas.height = newImage.height;
		newCanvas.width = newImage.width;
		newCanvas.getContext('2d').putImageData(newImage, 0, 0)
		holder.appendChild(newCanvas);
		canvas.parentNode.appendChild(holder);
	}

	var holder = $('<p style="border-bottom: 1px dotted black">')[0];
	holder.innerText = "words (flood fill):";
	var children = gids.map(group => {
		if (!group) {
			return;
		};
		var coords = group.map(i => {
			var x = i % newImage.width;
			var y = Math.floor(i / newImage.width);
			return [x,y];
		})
		var xCoords = coords.map(c => c[0]);
		var yCoords = coords.map(c => c[1]);

		var xMin = Math.min(...xCoords);
		var xMax = Math.max(...xCoords);
		var yMin = Math.min(...yCoords);
		var yMax = Math.max(...yCoords);

		var newCanvas = $('<canvas style="margin:5px;" class="single-word">')[0];
		var ret = {x: xMin, y: yMin, w: xMax - xMin, h: yMax - yMin, canvas: newCanvas};

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
		var wordImage = source_ctx.getImageData(xMin, yMin, newCanvas.width, newCanvas.height)
		newCanvas.getContext('2d').putImageData(wordImage, 0, 0)
		return ret;
	}).filter(_ => _).filter(word => word.w * word.h > 5 * 5).filter(word => word.h > 10 || (word.yMin > 0 && word.yMax < canvas.height));
	children.sort((a,b) => a.x - b.x).forEach(pair => {
		holder.appendChild(pair.canvas);
	})
	canvas.parentNode.appendChild(holder);

	return children;
}

function convert_to_greyscale(image) {
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
				levels.push(bg);
			} else {
				var [r, g, b] = [image.data[pxBase+0],image.data[pxBase+1], image.data[pxBase+2]];
				var avg = (r + g + b)/3;
				var level = avg < imageAverage ? fg : bg;
				levels.push(level);
			}
		}
	}

	return levels;
}
