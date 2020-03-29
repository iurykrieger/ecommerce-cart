const DbService = require("moleculer-db");
const MongoDBAdapter = require("moleculer-db-adapter-mongo");
const ApiGateway = require("moleculer-web");
const { v4 } = require('uuid');

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = {
	name: "carts",
	mixins: [DbService, ApiGateway],
	adapter: new MongoDBAdapter(process.env.DATABASE),
	collection: "carts",

	/**
	 * Settings
	 */
	settings: {

	},

	/**
	 * Dependencies
	 */
	dependencies: [],

	/**
	 * Actions
	 */
	actions: {

		/**
		 * Say a 'Hello' action.
		 *
		 * @returns
		 */
		getOrGenerate: {
			rest: {
				method: "GET",
				path: "/getOrGenerate"
			},
			params: {
				id: { type: 'string', optional: true }
			},
			/**
			 * @param { Context } ctx
			 */
			handler(ctx) {
				return this.getOrGenerate(ctx.params.id);
			}
		},

		addProduct: {
			rest: {
				method: "POST",
				path: "/add"
			},
			params: {
				id: { type: 'string', optional: true },
				productId: { type: 'string' },
				quantity: { type: 'string', default: 1 }
			},
			/**
			 *
			 * @param { Context } ctx
			 */
			handler (ctx) {
				return this.addProduct(
					ctx.params.id,
					ctx.params.productId,
					Number.parseInt(ctx.params.quantity)
				);
			}
		},

		getSummary: {
			rest: {
				method: "GET",
				path: "/summary"
			},
			params: {
				id: { type: 'string' }
			},
			/**
			 *
			 * @param { Context } ctx
			 */
			handler (ctx) {
				return this.getSummary(ctx.params.id);
			}
		}
	},

	/**
	 * Events
	 */
	events: {

	},

	/**
	 * Methods
	 */
	methods: {
		get (id) {
			return this.adapter.findOne({ id });
		},
		generate () {
			const cart = {
				id: v4(),
				items: []
			};
			return this.adapter.insert(cart);
		},
		async getOrGenerate (cartId) {
			return await this.get(cartId) || await this.generate();
		},
		async addProduct (id, productId, quantity = 1) {
			const cart = await this.getOrGenerate(id);

			const cartItem = cart.items.find(item => item.id === productId);

			if (cartItem) {
				cartItem.quantity = quantity;
			} else {
				cart.items.push({
					id: productId,
					quantity
				});
			}

			return this.adapter.updateById(cart._id, { $set: { items: cart.items } });
		},
		async getSummary (id) {
			const cart = await this.getOrGenerate(id);

			cart.items = await Promise.all(cart.items.map(async item => {
				const product = await this.broker.call('products.get', { id: item.id });

				return {
					...item,
					price: product && product.price,
					name: product && product.name,
					image: product && product.images.default,
					total: (product && product.price) * item.quantity
				};
			}));
			cart.total = cart.items.reduce((total, item) => total + item.total, 0);

			return cart;
		}
	},

	/**
	 * Service created lifecycle event handler
	 */
	created() {

	},

	/**
	 * Service started lifecycle event handler
	 */
	async started() {

	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() {

	}
};
