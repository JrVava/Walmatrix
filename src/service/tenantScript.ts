export default class SchemaDDL {
    private schema: string;
    constructor(schema: string) {
        this.schema = schema;
    }

    create_schema = (): string => {
        return `CREATE SCHEMA IF NOT EXISTS ${this.schema}`;
    };

    users = () => {
        return `CREATE TABLE ${this.schema}.users (
      id serial4 NOT NULL,
      first_name varchar NOT NULL,
      last_name varchar NOT NULL,
      email varchar NOT NULL,
      "password" varchar NOT NULL,
      is_active bool NOT NULL DEFAULT true,
      user_type int4 NOT NULL,
      is_freeze bool NOT NULL DEFAULT false,
      updated_at timestamp NOT NULL DEFAULT now(),
      store_name varchar NOT NULL,
      verify_code varchar(100) NULL,
      verify_code_at timestamp NULL,
      phone varchar(20) NULL,
      store_id int4 NULL,
      is_deleted bool NOT NULL DEFAULT false,
      is_user_sso bool NOT NULL DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now(),
      is_verified bool NOT NULL DEFAULT false,
	    acc_verify_code varchar(50) NULL,
      profile text NULL,
      company_name varchar(100) NULL,
      stripe_customer_id varchar(20) NULL,
      is_subscribed bool NOT NULL DEFAULT false,
      upgrade_required bool NOT NULL DEFAULT false,
      CONSTRAINT users_pk PRIMARY KEY (id),
      CONSTRAINT users_uq UNIQUE (email)
    );`;
    };
    orders = () => {
        return `CREATE TABLE ${this.schema}.orders (
      id serial4 NOT NULL,
      purchase_order_id varchar NULL,
      customer_order_id varchar NULL,
      customer_email_id varchar NULL,
      order_date int8 NOT NULL DEFAULT 0,
      shipping_info jsonb NULL,
      order_lines jsonb NULL,
      ship_node varchar NULL,
      store_id int4 NULL,
      formated_date date NULL,
      created_at timestamp NULL DEFAULT now(),
	    updated_at timestamp NULL DEFAULT now(),
      CONSTRAINT orders_pk PRIMARY KEY (id)
    );`;
    };

    order_charges = () => {
        return `CREATE TABLE ${this.schema}.order_charges (
      id serial4 NOT NULL,
      product_amount numeric NULL,
      order_tax numeric NULL,
      order_id int4 NULL,
      purchase_order_id varchar NULL,
      customer_order_id varchar NULL,
      charge_type varchar NULL,
      order_status varchar NULL,
      sku varchar NULL,
      order_line_number varchar NULL,
      created_at timestamp NULL DEFAULT now(),
	    updated_at timestamp NULL DEFAULT now(),
      CONSTRAINT order_charges_pk PRIMARY KEY (id)
    );`;
    };

    // products = () => {
    //   return `CREATE TABLE ${this.schema}.products (
    //     id serial4 NOT NULL,
    //     mart varchar NULL,
    //     sku varchar NULL,
    //     wpid varchar NULL,
    //     upc varchar NULL,
    //     gtin varchar NULL,
    //     product_name varchar NULL,
    //     shelf varchar NULL,
    //     product_type varchar NULL,
    //     price jsonb NULL,
    //     published_status varchar NULL,
    //     lifecycle_status varchar NULL,
    //     unpublished_reasons jsonb NULL,
    //     variants_group_id varchar NULL,
    //     variants_group_info jsonb NULL,
    //     store_id int4 NULL,
    //     image text NULL,
    //     item_id numeric NULL,
    //     created_at timestamp NULL DEFAULT now(),
    //     updated_at timestamp NULL DEFAULT now(),
    //     CONSTRAINT products_pk PRIMARY KEY (id)
    //   );`;
    // };
    products = () => {
        return `CREATE TABLE ${this.schema}.products (
      id serial4 NOT NULL,
      sku varchar NULL,
      item_id numeric NULL,
      product_name varchar NULL,
      lifecycle_status varchar NULL,
      publish_status varchar NULL,
      status_change_reason varchar NULL,
      product_category varchar NULL,
      price numeric NULL,
      currency varchar NULL,
      buy_box_item_price numeric NULL,
      buy_box_shipping_price numeric NULL,
      msrp numeric NULL,
      product_tax_code varchar NULL,
      ship_methods varchar NULL,
      shipping_weight varchar NULL,
      shipping_weight_unit varchar NULL,
      fulfillment_lag_time varchar NULL,
      fulfillment_type varchar NULL,
      wfs_sales_restriction varchar NULL,
      wpid varchar NULL,
      gtin varchar NULL,
      upc varchar NULL,
      item_page_url varchar NULL,
      primary_image_url varchar NULL,
      shelf_name varchar NULL,
      primary_category_path jsonb NULL,
      brand varchar NULL,
      offer_start_date varchar NULL,
      offer_end_date varchar NULL,
      item_creation_date varchar NULL,
      item_last_updated varchar NULL,
      reviews_count numeric NULL,
      average_rating numeric NULL,
      searchable varchar NULL,
      variant_group_id varchar NULL,
      primary_variant varchar NULL,
      variant_grouping_attributes varchar NULL,
      variant_grouping_values varchar NULL,
      competitor_url varchar NULL,
      competitor_price numeric NULL,
      competitor_ship_price numeric NULL,
      competitor_last_date_fetched varchar NULL,
      repricer_strategy varchar NULL,
      minimum_seller_allowed_price varchar NULL,
      maximum_seller_allowed_price varchar NULL,
      repricer_status varchar NULL,
      store_id numeric NULL,
      created_at timestamp NULL DEFAULT now(),
      updated_at timestamp NULL DEFAULT now(),
      CONSTRAINT products_pk PRIMARY KEY (id)
    );`;
    };

    advertisers = () => {
        return `CREATE TABLE ${this.schema}.advertisers (
        id serial4 NOT NULL,
        campaign_name varchar NULL,
        campaign_id int4 NULL,
        ad_group_name varchar NULL,
        ad_group_id numeric NULL,
        item_name varchar NULL,
        item_id numeric NULL,
        search_keyword varchar NULL,
        bidded_keyword varchar NULL,
        match_type varchar NULL,
        impressions numeric NULL,
        clicks numeric NULL,
        ctr numeric NULL,
        ad_spend numeric NULL,
        conversion_rate numeric NULL,
        orders numeric NULL,
        conversion_rate_order_based numeric NULL,
        total_attributed_sales numeric NULL,
        advertised_sku_sales numeric NULL,
        other_sku_sales numeric NULL,
        units_sold numeric NULL,
        advertise_sku_units numeric NULL,
        other_sku_units numeric NULL,
        roas numeric NULL,
        store_id int4 NULL,
        advertiser_report_id int4 NULL,
        date date NULL,
        created_at timestamp NULL DEFAULT now(),
	      updated_at timestamp NULL DEFAULT now(),
        CONSTRAINT advertisers_pk PRIMARY KEY (id)
    );`;
    };
    campaign_snapshot = () => {
        return `CREATE TABLE ${this.schema}.campaign_snapshot (
            id serial4 NOT NULL,
            name varchar NULL,
            campaign_type varchar NULL,
            targeting_type varchar NULL,
            status varchar NULL,
            budget_type varchar NULL,
            start_date varchar NULL,
            end_date varchar NULL,
            total_budget numeric NULL,
            daily_budget numeric NULL,
            rollover bool NULL,
            advertiser_id int4 NULL,
            campaign_id int4 NULL,
            channel varchar NULL,
            created_at timestamp NULL DEFAULT now(),
            store_id int4 NULL,
	          updated_at timestamp NULL DEFAULT now(),
            CONSTRAINT campaign_snapshot_pk PRIMARY KEY (id)
        );`;
    };

    recon = () => {
        return `CREATE TABLE ${this.schema}.recon (
      id serial4 NOT NULL,
      period_start_date date NULL,
      period_end_date date NULL,
      total_payable numeric NULL,
      currency varchar NULL,
      transaction_key varchar NULL,
      transaction_posted_timestamp date NULL,
      transaction_type varchar NULL,
      transaction_description varchar NULL,
      customer_order varchar NULL,
      customer_order_line numeric NULL,
      purchase_order varchar NULL,
      purchase_order_line numeric NULL,
      amount numeric NULL,
      amount_type varchar NULL,
      ship_qty numeric NULL,
      commission_rate numeric NULL,
      transaction_reason_description varchar NULL,
      partner_item_id varchar NULL,
      partner_gtin varchar NULL,
      partner_item_name varchar NULL,
      product_tax_code numeric NULL,
      ship_to_state varchar NULL,
      ship_to_city varchar NULL,
      ship_to_zipcode varchar NULL,
      contract_category varchar NULL,
      product_type varchar NULL,
      commission_rule varchar NULL,
      shipping_method varchar NULL,
      fulfillment_type varchar NULL,
      fulfillment_details varchar NULL,
      original_commission numeric NULL,
      commission_incentive_program varchar NULL,
      commission_saving numeric NULL,
      customer_promo_type varchar NULL,
      total_walmart_funded_savings_program varchar NULL,
      campaign_id varchar NULL,
      store_id int4 NULL,
      created_at timestamp NULL DEFAULT now(),
	    updated_at timestamp NULL DEFAULT now(),
      CONSTRAINT recon_pk PRIMARY KEY (id)
    );`;
    };

    cogs = () => {
        return `CREATE TABLE ${this.schema}.cogs (
      id serial4 NOT NULL,
      product_id int4 NULL,
      amount numeric NULL,
      "start" date NULL,
      "end" date NULL,
      created_at timestamp NULL DEFAULT now(),
	    updated_at timestamp NULL DEFAULT now(),
      CONSTRAINT cogs_pk PRIMARY KEY (id)
    );`;
    };

    returns = () => {
        return `CREATE TABLE ${this.schema}.returns (
      id serial4 NOT NULL,
      return_order_id varchar NULL,
      customer_email_id varchar NULL,
      customer_name jsonb NULL,
      customer_order_id varchar NULL,
      return_order_date varchar NULL,
      return_by_date varchar NULL,
      refund_mode varchar NULL,
      total_currency_amount numeric NULL,
      total_currency_unit varchar NULL,
      return_line_groups jsonb NULL,
      return_order_lines jsonb NULL,
      return_channel_name varchar NULL,
      store_id int4 NULL,
      created_at timestamp NULL DEFAULT now(),
	    updated_at timestamp NULL DEFAULT now(),
      CONSTRAINT returns_pk PRIMARY KEY (id)
    );`;
    };

    return_charges = () => {
        return `CREATE TABLE ${this.schema}.return_charges (
      id serial4 NOT NULL,
      charge_category varchar NULL,
      charge_name varchar NULL,
      currency_amount numeric NULL,
      currency_unit varchar NULL,
      is_discount bool NULL,
      is_billable bool NULL,
      tax_name varchar NULL,
      tax_currency_amount numeric NULL,
      tax_currency_unit varchar NULL,
      tax_tax_per_unit_currency_amount numeric NULL,
      tax_tax_per_unit_currency_unit varchar NULL,
      return_id int4 NULL,
      created_at timestamp NULL DEFAULT now(),
	    updated_at timestamp NULL DEFAULT now(),
      CONSTRAINT return_charges_pk PRIMARY KEY (id)
    );`;
    };
}
