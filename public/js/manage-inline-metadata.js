'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

$(function () {
	$.get('/inline-metadata-defs', function (data) {
		var domContainer = document.querySelector('#existing_defs');
		$(domContainer).empty();
		ReactDOM.render(e(InlineAnnoTable, { defs: data.inline_metadata_defs }), domContainer);
		$('#loading').hide();
	});

	// because I don't recall a way to embed booleans into HTML forms directly
	function parseBool(val) {
		if (val == 'yes') {
			return 1;
		} else if (val == 'no') {
			return 0;
		} else {
			var err = 'Form error - tried to pass a value "' + val + '" as a boolean';
			alert(err);
			throw new Error(err);
		}
	}

	$('#create-def').on('click', function () {
		var name = $('[name=name]').val();
		var short_name = $('[name=short_name]').val();
		var self_closing = parseBool($('[name=self_closing]').val());

		$.post('/create-inline-metadata-def', { name: name, short_name: short_name, self_closing: self_closing });
	});
});

var e = React.createElement;

var InlineAnnoTable = function (_React$Component) {
	_inherits(InlineAnnoTable, _React$Component);

	function InlineAnnoTable() {
		_classCallCheck(this, InlineAnnoTable);

		return _possibleConstructorReturn(this, (InlineAnnoTable.__proto__ || Object.getPrototypeOf(InlineAnnoTable)).apply(this, arguments));
	}

	_createClass(InlineAnnoTable, [{
		key: 'render',
		value: function render() {
			var rows = this.props.defs.map(function (def) {
				return React.createElement(
					'tr',
					null,
					React.createElement(
						'td',
						null,
						def.name
					),
					React.createElement(
						'td',
						null,
						def.short_name
					),
					React.createElement(
						'td',
						null,
						def.self_closing ? "single point" : "range"
					)
				);
			});
			return React.createElement(
				'table',
				{ 'class': 'tabular' },
				React.createElement(
					'tr',
					null,
					React.createElement(
						'th',
						null,
						'Name'
					),
					React.createElement(
						'th',
						null,
						'Short Form'
					),
					React.createElement(
						'th',
						null,
						'spans a...'
					)
				),
				rows
			);
		}
	}]);

	return InlineAnnoTable;
}(React.Component);