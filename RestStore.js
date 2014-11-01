
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/has',
    'dojo/Stateful',
    'dojo/request',
    'dojo/io-query',
    'dojo/store/util/QueryResults'
], function (declare, lang, has, Stateful, request, ioQuery, QueryResults) {
    
    return declare(Stateful, {
        
        idProperty : null,
        target : null,
        accepts: 'application/javascript, application/json',
        
        constructor : function (kw) {
            lang.mixin(this, kw);
        },
        
        _targetSetter : function (target) {
            target = target.split('?')[0];
            if (target.slice(-1) === '/') {
                this.target = target.slice(0, -1)
            } else {
                this.target = target;
            }
        },

        has : function (id, options) {
            options = options || {};
            var headers = lang.mixin({ Accept: this.accepts }, options.headers);
            request(this.target + '/' + id, {
                method : 'HEAD',
                headers : headers,
                preventCache : true,
                handleAs : 'json'
            })
            .response
            .then(function (response) {
                if (response.status === 200) {
                    return true;
                } else if (response.status === 404) {
                    return false;
                }
                // todo elsewhere?
                return false;
            });
        },

        get : function (id, options) {
            options = options || {};
            var headers = lang.mixin({ Accept: this.accepts }, options.headers);
            return request(this.target + '/' + id, {
                method : 'GET',
                headers : headers,
                preventCache : true,
                handleAs : 'json'
            });
        },

        query : function (query, options) {
            options = options || {};
            var headers = lang.mixin({ Accept: this.accepts }, options.headers);
            var hasQuestionMark = this.target.indexOf('?') > -1;
            if (query && typeof query === 'string') {
                query = ioQuery.queryToObject(query);
            }
            if (options.start >= 0 || options.count >= 0) {
                query.per_page = options.count + 1;
                query.page = options.start * options.count;
            }
            if (options && options.sort) {
                var sort, sortStr = '';
                for(var i = 0, l = options.sort.length; i < l; i++) {
                    sort = options.sort[i];
                    if (sort instanceof Array) {
                        sortStr += sort[1] ? '+' : '-';
                        sortStr += encodeURIComponent(sort[0]) + ','
                    }
                }
                query.sort = sortStr.slice(-1);
            }
            var promise = request(this.target, {
                method : 'GET',
                handleAs: 'json',
                query : query,
    			headers: headers
    		});
            promise.total = promise.response.then(function (response) {
                return response.getHeader('Total-Count')
                    || response.getHeader('X-Total-Count');
            });
            return QueryResults(promise);
        },

        all : function (filters, options) {
            // alias to query
            return this.query(filters, options);
        },
        
        put : function (param1, param2, param3) {
            // put(id, item, options)
            // put(id, item)
            // put(item, options)
            // put(item)
            if (param3 === undefined) {
                if (param2 === undefined) {
                    item = param1;
                    id = this.getIdentity(item);
                    options = {};
                } else {
                    if (typeof param1 === 'object') {
                        item = param1;
                        options = param2;
                        id = (id in options && options.id) || this.getIdentity(item);
                    } else {
                        id = param1;
                        item = param2;
                        options = {};
                    }
                }
            } else {
                id = param1;
                item = param2;
                options = param3;
            }
            var hasId = typeof id !== 'undefined';
            return request(this.target + (hasId ? '/' + id : ''), {
        		method: options.method || (hasId ? 'PUT' : 'POST'),
        		query: item,
            	handleAs: 'json',
            	headers: lang.mixin({
        			'Content-Type': 'application/json',
            		Accept: this.accepts
            	}, options.headers)
            });
        },

        add: function(item, options) {
            options = options || {};
            options.method = 'POST';
        	return this.put(item, options);
        },

        post : function (item, options) {
            // alias to add
            return this.add(item, options);
        },
        
        remove: function (id, options) {
        	options = options || {};
        	return request(this.target + '/' + id, {
                method : 'DELETE',
        		headers: lang.mixin({}, this.headers, options.headers)
        	});
        },

        'delete' : function (id, options) {
            // alias to remove
            return this.remove(id, options);
        },
        
        patch : function (id, item, options) {
            options = options || {};
            options.method = 'PATCH';
            return this.put(id, item, options);
        },

        getIdentity : function (item) {
            return item[this.idProperty];
        }
        
    });
    
});
