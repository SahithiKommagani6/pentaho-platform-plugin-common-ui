/*! ******************************************************************************
 *
 * Pentaho Community Edition
 *
 * Copyright (C) 2024 by Hitachi Vantara, LLC : http://www.pentaho.com
 *
 * Use of this software is governed by the Business Source License included
 * in the LICENSE.TXT file.
 *
 * Change Date: 2028-08-13
 ******************************************************************************/
/* 
 * This was added due to a missing implementation according to the Store specification 
 * from dojo http://dojotoolkit.org/reference-guide/1.9/dojo/store.html#dojo-store. 
 * Basically, the options argument on the add/put isn't used. 
 * This change was proposed in the context of this bug https://bugs.dojotoolkit.org/ticket/15660.
 */

define(["../_base/declare", "./util/QueryResults", "./util/SimpleQueryEngine" /*=====, "./api/Store" =====*/],
    function(declare, QueryResults, SimpleQueryEngine /*=====, Store =====*/){

// module:
//		dojo/store/Memory

// No base class, but for purposes of documentation, the base class is dojo/store/api/Store
        var base = null;
        /*===== base = Store; =====*/

        return declare("dojo.store.Memory", base, {
            // summary:
            //		This is a basic in-memory object store. It implements dojo/store/api/Store.
            constructor: function(options){
                // summary:
                //		Creates a memory object store.
                // options: dojo/store/Memory
                //		This provides any configuration information that will be mixed into the store.
                //		This should generally include the data property to provide the starting set of data.
                for(var i in options){
                    this[i] = options[i];
                }
                this.setData(this.data || []);
            },
            // data: Array
            //		The array of all the objects in the memory store
            data:null,

            // idProperty: String
            //		Indicates the property to use as the identity property. The values of this
            //		property should be unique.
            idProperty: "id",

            // index: Object
            //		An index of data indices into the data array by id
            index:null,

            // queryEngine: Function
            //		Defines the query engine to use for querying the data store
            queryEngine: SimpleQueryEngine,
            get: function(id){
                // summary:
                //		Retrieves an object by its identity
                // id: Number
                //		The identity to use to lookup the object
                // returns: Object
                //		The object in the store that matches the given id.
                return this.data[this.index[id]];
            },
            getIdentity: function(object){
                // summary:
                //		Returns an object's identity
                // object: Object
                //		The object to get the identity from
                // returns: Number
                return object[this.idProperty];
            },
            put: function(object, options){
                // summary:
                //		Stores an object
                // object: Object
                //		The object to store.
                // options: dojo/store/api/Store.PutDirectives?
                //		Additional metadata for storing the data.  Includes an "id"
                //		property if a specific id is to be used.
                // returns: Number
                var data = this.data,
                    idProperty = this.idProperty;

                var id = object[idProperty] = (options && "id" in options) ? options.id : idProperty in object ? object[idProperty] : Math.random();
                var existingObject = false;
                if(id in this.index){
                    existingObject = true;
                }

                if(options){
                    if(options.overwrite === false){
                        if(existingObject){
                            throw new Error("Object already exists");
                        }
                    }
                    if(options.parent){
                        var parentRefId = this.getIdentity(options.parent);

                        if(parentRefId in this.index){
                            object.parent = parentRefId;
                            // let the object to show up as the last child
                            // of its parent
                            if(existingObject){
                                this.remove(id);
                            }
                        } else{
                            throw new Error("Object specified in options.parent does not exists");
                        }
                    }
                    if(options.before){
                        var beforeRefId = this.getIdentity(options.before);
                        if(beforeRefId in this.index) {
                            if(existingObject){
                                // remove the object from its current position
                                this.remove(id);
                            }
                        }
                        // carve out a spot for the new item
                        data.splice(this.index[beforeRefId], 0, object);
                        // now we have to reindex
                        this.setData(data);

                        return id;
                    } else {
                        throw new Error("Object specified in options.before does not exists");
                    }
                }

                if(existingObject){
                    // replace the entry in data
                    data[this.index[id]] = object;
                }else{
                    // add the new object
                    this.index[id] = data.push(object) - 1;
                }
                return id;
            },
            add: function(object, options){
                // summary:
                //		Creates an object, throws an error if the object already exists
                // object: Object
                //		The object to store.
                // options: dojo/store/api/Store.PutDirectives?
                //		Additional metadata for storing the data.  Includes an "id"
                //		property if a specific id is to be used.
                // returns: Number
                (options = options || {}).overwrite = false;
                // call put with overwrite being false
                return this.put(object, options);
            },
            remove: function(id){
                // summary:
                //		Deletes an object by its identity
                // id: Number
                //		The identity to use to delete the object
                // returns: Boolean
                //		Returns true if an object was removed, falsy (undefined) if no object matched the id
                var index = this.index;
                var data = this.data;
                if(id in index){
                    data.splice(index[id], 1);
                    // now we have to reindex
                    this.setData(data);
                    return true;
                }
            },
            query: function(query, options){
                // summary:
                //		Queries the store for objects.
                // query: Object
                //		The query to use for retrieving objects from the store.
                // options: dojo/store/api/Store.QueryOptions?
                //		The optional arguments to apply to the resultset.
                // returns: dojo/store/api/Store.QueryResults
                //		The results of the query, extended with iterative methods.
                //
                // example:
                //		Given the following store:
                //
                // 	|	var store = new Memory({
                // 	|		data: [
                // 	|			{id: 1, name: "one", prime: false },
                //	|			{id: 2, name: "two", even: true, prime: true},
                //	|			{id: 3, name: "three", prime: true},
                //	|			{id: 4, name: "four", even: true, prime: false},
                //	|			{id: 5, name: "five", prime: true}
                //	|		]
                //	|	});
                //
                //	...find all items where "prime" is true:
                //
                //	|	var results = store.query({ prime: true });
                //
                //	...or find all items where "even" is true:
                //
                //	|	var results = store.query({ even: true });
                return QueryResults(this.queryEngine(query, options)(this.data));
            },
            setData: function(data){
                // summary:
                //		Sets the given data as the source for this store, and indexes it
                // data: Object[]
                //		An array of objects to use as the source of data.
                if(data.items){
                    // just for convenience with the data format IFRS expects
                    this.idProperty = data.identifier;
                    data = this.data = data.items;
                }else{
                    this.data = data;
                }
                this.index = {};
                for(var i = 0, l = data.length; i < l; i++){
                    this.index[data[i][this.idProperty]] = i;
                }
            }
        });

    });
