'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

$(function () {
	$.get('/dev/images/get-data', function (data) {
		var domContainer = document.querySelector('#concordance-output');
		$(domContainer).empty();
		ReactDOM.render(e(ConcordanceSet, { lines: data }), domContainer);
	});
});

var e = React.createElement;

var ConcordanceSet = function (_React$Component) {
	_inherits(ConcordanceSet, _React$Component);

	function ConcordanceSet() {
		_classCallCheck(this, ConcordanceSet);

		return _possibleConstructorReturn(this, (ConcordanceSet.__proto__ || Object.getPrototypeOf(ConcordanceSet)).apply(this, arguments));
	}

	_createClass(ConcordanceSet, [{
		key: 'render',
		value: function render() {
			var items = this.props.lines.map(function (line) {
				return React.createElement(ConcordanceLine, { line: line });
			});
			return React.createElement(
				'ul',
				null,
				items
			);
		}
	}]);

	return ConcordanceSet;
}(React.Component);

var ConcordanceLine = function (_React$Component2) {
	_inherits(ConcordanceLine, _React$Component2);

	function ConcordanceLine() {
		_classCallCheck(this, ConcordanceLine);

		return _possibleConstructorReturn(this, (ConcordanceLine.__proto__ || Object.getPrototypeOf(ConcordanceLine)).apply(this, arguments));
	}

	_createClass(ConcordanceLine, [{
		key: 'render',
		value: function render() {
			var line = this.props.line;
			return React.createElement(
				'li',
				null,
				React.createElement(
					'span',
					null,
					line.text
				),
				React.createElement(LineSource, { line: line })
			);
		}
	}]);

	return ConcordanceLine;
}(React.Component);

var LineSource = function (_React$Component3) {
	_inherits(LineSource, _React$Component3);

	function LineSource() {
		_classCallCheck(this, LineSource);

		return _possibleConstructorReturn(this, (LineSource.__proto__ || Object.getPrototypeOf(LineSource)).apply(this, arguments));
	}

	_createClass(LineSource, [{
		key: 'render',
		value: function render() {
			var line = this.props.line;
			return React.createElement(
				'span',
				{ 'class': 'source-line-indicator' },
				'[ line #',
				line.line_num + 1,
				' of page ',
				React.createElement(PageLink, { name: line.filename, dir: line.proj_name }),
				' ]'
			);
		}
	}]);

	return LineSource;
}(React.Component);

var PageLink = function (_React$Component4) {
	_inherits(PageLink, _React$Component4);

	function PageLink() {
		_classCallCheck(this, PageLink);

		return _possibleConstructorReturn(this, (PageLink.__proto__ || Object.getPrototypeOf(PageLink)).apply(this, arguments));
	}

	_createClass(PageLink, [{
		key: 'render',
		value: function render() {
			return React.createElement(
				'a',
				{ href: 'http://image-store.tpen-demo.americanpaleography.org/' + this.props.dir + '/' + this.props.name },
				this.props.name
			);
		}
	}]);

	return PageLink;
}(React.Component);