/*
 * Copyright MADE/YOUR/DAY OG <mail@madeyourday.net>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Rst.Slide Class
 */
Rst.Slide = (function() {

	/**
	 * Rst.Slide Constructor
	 * @param Element element slide element
	 */
	function Slide(element, slider) {

		var self = this;

		this.slider = slider;

		var $element = $(element);

		this.data = {
			name: $element.attr('data-rsts-name') || $(element).attr('title')
		};

		if (element.tagName.toLowerCase() === 'img') {
			this.type = 'image';
		}
		this.type = $element.attr('data-rsts-type') || this.type || 'default';

		this.element = $(document.createElement('div'))
			.addClass(slider.options.cssPrefix + 'slide')
			.addClass(slider.options.cssPrefix + 'slide-' + this.type)
			.append(element);

		if (this.type === 'image') {
			this.data.name = this.data.name || this.element.find('img').attr('alt');
		}

		if (this.data.name) {
			$(document.createElement('div'))
				.addClass(slider.options.cssPrefix + 'caption')
				.text(this.data.name)
				.appendTo(this.element);
		}

		this.element.find('img').on('load', function(){
			slider.resize();
		});

		var headlines = this.element.find('h1,h2,h3,h4,h5,h6');
		if (! this.data.name && headlines.length) {
			this.data.name = headlines.text();
		}

		if (this.type === 'video') {

			this.data.video = $element.attr('data-rsts-video');
			$(document.createElement('a'))
				.attr('href', this.data.video)
				.text('play')
				.addClass(this.slider.options.cssPrefix + 'video-play')
				.on('click', function(event) {
					event.preventDefault();
					self.startVideo();
				})
				.appendTo(this.element);

		}

		this.setState('inactive');

	}

	/**
	 * get width and height based on width or height
	 * @return object {x: ..., y: ...}
	 */
	Slide.prototype.size = function(x, y, ret) {

		if (x === true) {
			x = null;
			ret = true;
		}

		if (x && ! y) {
			this.slider.modify(this.element, {width: x});
			if (ret) {
				y = this.element.height();
			}
		}
		else if (y && ! x) {
			this.slider.modify(this.element, {height: y});
			if (ret) {
				x = this.element.width();
			}
		}
		else if (x && y) {
			this.slider.modify(this.element, {width: x, height: y});
			this.scaleContent(x, y);
		}
		else if(ret) {
			x = this.element.width();
			y = this.element.height();
		}

		return {
			x: x,
			y: y
		};

	};

	/**
	 * scale slide contents based on width and height
	 */
	Slide.prototype.scaleContent = function(x, y) {

		var originalSize, originalProp, newProp, css;
		var image = this.element.find('img').first();
		var scaleMode = this.slider.options.scaleMode;

		if (this.type === 'image' || this.type === 'video') {

			image.css(css = {
				width: 'auto',
				'max-width': 'none',
				'min-width': 0,
				height: 'auto',
				'max-height': 'none',
				'min-height': 0,
				'margin-left': 0,
				'margin-top': 0
			});
			css['max-width'] = css['min-width'] = '';
			css['max-height'] = css['min-height'] = '';

			originalSize = {
				x: image.width(),
				y: image.height()
			};
			originalProp = originalSize.x / originalSize.y;
			newProp = x / y;

			if (scaleMode === 'fit' || scaleMode === 'crop') {

				if (
					(originalProp >= newProp && scaleMode === 'fit') ||
					(originalProp <= newProp && scaleMode === 'crop')
				) {
					css.width = x;
					css.height = x / originalProp;
					css['margin-top'] = (y - css.height) / 2;
				}
				else {
					css.width = y * originalProp;
					css.height = y;
					css['margin-left'] = (x - css.width) / 2;
				}

			}
			else if (scaleMode === 'scale') {

				css.width = x;
				css.height = y;

			}

			image.css(css);

		}

	};

	/**
	 * @param string state "active", "preactive", or "inactive"
	 */
	Slide.prototype.setState = function(state) {

		if (
			this.type === 'video' &&
			this.state &&
			state === 'inactive' &&
			state !== this.state
		) {
			this.stopVideo();
		}
		if (
			this.type === 'video' &&
			this.state &&
			state === 'active' &&
			state !== this.state &&
			this.slider.options.videoAutoplay
		) {
			this.startVideo();
		}

		this.state = state;

		var prefix = this.slider.options.cssPrefix;
		this.element
			.removeClass(prefix + 'active')
			.removeClass(prefix + 'inactive')
			.removeClass(prefix + 'preactive')
			.removeClass(prefix + 'postactive')
			.addClass(prefix + state);

	};

	/**
	 * stop video
	 */
	Slide.prototype.stopVideo = function() {

		if (this.eventNamespace) {
			$(window).off('message.' + this.eventNamespace);
			delete this.eventNamespace;
		}
		if (this.videoElement) {
			// IE bugfix
			this.videoElement.attr('src', '');
			this.videoElement.remove();
			delete this.videoElement;
		}
		if (this.videoStopButton) {
			this.videoStopButton.remove();
			delete this.videoStopButton;
		}

		// mozilla has problems with iframes/flash and 3D transforms
		if (
			this.slider.engine === 'moz' &&
			this.slider.css3Supported &&
			this.slider.options.type === 'slide'
		) {
			this.slider.elements.view.css({
				transform: 'translateZ(0)'
			});
		}

	};

	/**
	 * start video
	 */
	Slide.prototype.startVideo = function() {

		var self = this;
		var videoId, apiCallback;

		if (this.data.video.substr(0, 31) === 'http://www.youtube.com/watch?v=') {

			videoId = this.data.video.substr(31, 11);
			this.videoElement = $(document.createElement('iframe'))
				.css({
					width: '100%',
					height: '100%',
					position: 'absolute',
					top: 0,
					left: 0
				})
				.attr('src',
					'http://www.youtube.com/embed/' +
					videoId +
					'?autoplay=1&enablejsapi=1&wmode=opaque'
				)
				.attr('frameborder', 0)
				.attr('allowfullscreen', 'allowfullscreen')
				.appendTo(this.element);

			apiCallback = function() {
				if (self.videoElement && window.YT) {
					new YT.Player(self.videoElement.get(0), {
						events: {
							onStateChange: function(event) {
								if (event.data === YT.PlayerState.ENDED) {
									self.stopVideo();
								}
							}
						}
					});
				}
			};

			if (window.YT && YT.Player) {
				apiCallback();
			}
			else {
				$(document.createElement('script'))
					.attr('src', '//www.youtube.com/iframe_api')
					.appendTo(document.head);
				window.onYouTubeIframeAPIReady = function() {
					delete window.onYouTubeIframeAPIReady;
					apiCallback();
				};
			}

		}
		else if (this.data.video.substr(0, 17) === 'http://vimeo.com/') {

			videoId = this.data.video.substr(17);

			this.videoElement = $(document.createElement('iframe'))
				.css({
					width: '100%',
					height: '100%',
					position: 'absolute',
					top: 0,
					left: 0
				})
				.attr('src',
					'http://player.vimeo.com/video/' +
					videoId +
					'?autoplay=1&api=1'
				)
				.attr('frameborder', 0)
				.attr('allowfullscreen', 'allowfullscreen')
				.appendTo(this.element);

			this.eventNamespace = 'rsts' + new Date().getTime();
			$(window).on('message.' + this.eventNamespace, function(event) {
				var data = JSON.parse(event.originalEvent.data);
				if (data && data.event) {
					if (data.event === 'ready') {
						self.videoElement.get(0).contentWindow.postMessage(
							'{"method":"addEventListener","value":"finish"}',
							self.videoElement.attr('src').split('?')[0]
						);
					}
					else if (data.event === 'finish') {
						self.stopVideo();
					}
				}
			});

		}

		// mozilla has problems with iframes/flash and 3D transforms
		if (
			this.videoElement &&
			this.slider.engine === 'moz' &&
			this.slider.css3Supported &&
			this.slider.options.type === 'slide'
		) {
			this.slider.css3Supported = false;
			this.slider.modify(this.element, {
				offset: this.slider.slideIndex *
					(this.slider.slideSize + this.slider.options.gapSize)
			});
			this.slider.modify(this.slider.elements.slides, {
				offset: - this.slider.slideIndex *
					(this.slider.slideSize + this.slider.options.gapSize)
			});
			this.slider.elements.view.css({
				transform: ''
			});
			this.slider.css3Supported = true;
		}

		this.videoStopButton = $(document.createElement('a'))
			.attr('href', this.data.video)
			.text('stop')
			.addClass(this.slider.options.cssPrefix + 'video-stop')
			.on('click', function(event) {
				event.preventDefault();
				self.stopVideo();
			})
			.appendTo(this.element);

	};

	/**
	 * @return object {}
	 */
	Slide.prototype.getData = function() {
		return this.data;
	};

	return Slide;
})();
