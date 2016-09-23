// returns click as decimal (.77) of the total object's width
function clickPercent(e,obj) {
	return (e.pageX - obj.getBoundingClientRect().left) / obj.offsetWidth;
}

// Animation functions
function scrollToSmooth(el,targetScroll,duration) {
    // const   scrollHeight = window.scrollY,
	var beginScroll = el.scrollTop,
			beginTime = Date.now();

	Logger.get('animation').info('Beginning animation: '+beginTime+' '+beginScroll+' to '+targetScroll);
    requestAnimationFrame(step);
    function step () {
        setTimeout(function() {
					//Get our time diff to scale against.
					var now = Date.now();

					if ( now <= beginTime + duration) {
						//Queue the next frame ahead of time
						requestAnimationFrame(step);

						//This is probably overcomplicated, but this gets the amount we need to add to the initial scroll for our time
		        var mod = easeInOut( now, beginTime,duration, beginScroll,targetScroll );

						Logger.get("animation").debug('anim: '+ (now-beginTime) +' + '+mod);

						//Set the scroll absolutely
						if( beginScroll < targetScroll ) { el.scrollTop = beginScroll + mod; }
						else { el.scrollTop = beginScroll - mod; }

		      } else {
						//Final frame, don't schedule another.
						Logger.get("animation").debug('Ending animation: end:'+ (now > (beginTime + duration))+' s:'+el.scrollTop);

						el.scrollTop = targetScroll;
		      }
		  	}, 15 );
		}
}
