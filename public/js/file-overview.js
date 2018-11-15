'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

$(function () {
	$.get('/file-list', function (data) {
		var sel = $('#file-chooser');
		data.files.forEach(function (file) {
			var opt = $('<option>');
			opt.val(file.id);
			opt.text('(proj ' + file.project + '): ' + file.name);
			sel.append(opt);
		});
	});

	$('#file-chooser').on('change', function () {
		var file_id = parseInt(this.value);

		$.get('/view-file/' + file_id, function (data) {
			$('#debug').text(JSON.stringify(data, null, '  '));

			var domContainer = document.querySelector('#transcription');
			$(domContainer).empty();
			ReactDOM.render(e(TranscriptionOutput, { data: data }), domContainer);
		});
	});
});

var e = React.createElement;

var TranscriptionOutput = function (_React$Component) {
	_inherits(TranscriptionOutput, _React$Component);

	function TranscriptionOutput(props) {
		_classCallCheck(this, TranscriptionOutput);

		var _this = _possibleConstructorReturn(this, (TranscriptionOutput.__proto__ || Object.getPrototypeOf(TranscriptionOutput)).call(this, props));

		_this.lines = _this.props.data.lines.filter(function (x) {
			return x.type_name == 'transcription';
		});
		return _this;
	}

	_createClass(TranscriptionOutput, [{
		key: 'render',
		value: function render() {
			var items = this.lines.map(function (line) {
				return React.createElement(
					'li',
					null,
					line.value
				);
			});
			return React.createElement(
				'ul',
				null,
				items
			);
		}
	}]);

	return TranscriptionOutput;
}(React.Component);