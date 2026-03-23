<?php
/**
 * Plugin Name: Custom Cart Form
 * Description: Formulario de cantidad para el carrito de WooCommerce con botones +/- y eliminar. Shortcode [custom_cart_form] para usar en loops de Bricks Builder.
 * Version: 1.0.0
 * Author: Lucuma Agency
 * Text Domain: custom-cart-form
 * Requires Plugins: woocommerce
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'CCF_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'CCF_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'CCF_VERSION', '1.0.0' );

final class Custom_Cart_Form {

    private static $instance = null;

    public static function instance() {
        if ( is_null( self::$instance ) ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action( 'plugins_loaded', [ $this, 'init' ] );
    }

    public function init() {
        if ( ! class_exists( 'WooCommerce' ) ) {
            add_action( 'admin_notices', function () {
                echo '<div class="error"><p><strong>Custom Cart Form</strong> requiere WooCommerce activo.</p></div>';
            } );
            return;
        }

        // Shortcode
        add_shortcode( 'custom_cart_form', [ $this, 'render_shortcode' ] );

        // Assets
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_assets' ] );

        // AJAX handlers
        add_action( 'wp_ajax_ccf_update_qty', [ $this, 'ajax_update_qty' ] );
        add_action( 'wp_ajax_nopriv_ccf_update_qty', [ $this, 'ajax_update_qty' ] );
        add_action( 'wp_ajax_ccf_remove_item', [ $this, 'ajax_remove_item' ] );
        add_action( 'wp_ajax_nopriv_ccf_remove_item', [ $this, 'ajax_remove_item' ] );
        add_action( 'wp_ajax_ccf_add_to_cart', [ $this, 'ajax_add_to_cart' ] );
        add_action( 'wp_ajax_nopriv_ccf_add_to_cart', [ $this, 'ajax_add_to_cart' ] );
    }

    public function enqueue_assets() {
        wp_enqueue_style(
            'ccf-style',
            CCF_PLUGIN_URL . 'assets/css/cart-form.css',
            [],
            CCF_VERSION
        );

        wp_enqueue_script(
            'ccf-script',
            CCF_PLUGIN_URL . 'assets/js/cart-form.js',
            [ 'jquery' ],
            CCF_VERSION,
            true
        );

        wp_localize_script( 'ccf-script', 'ccf_data', [
            'ajax_url' => admin_url( 'admin-ajax.php' ),
            'nonce'    => wp_create_nonce( 'ccf_nonce' ),
        ] );
    }

    /**
     * Shortcode: [custom_cart_form]
     * Works inside Bricks loops — auto-detects the current product ID.
     */
    public function render_shortcode( $atts ) {
        $atts = shortcode_atts( [
            'product_id' => 0,
        ], $atts );

        // Auto-detect product ID from loop context
        $product_id = (int) $atts['product_id'];
        if ( ! $product_id ) {
            global $product;
            if ( $product && is_a( $product, 'WC_Product' ) ) {
                $product_id = $product->get_id();
            } elseif ( get_the_ID() ) {
                $product_id = get_the_ID();
            }
        }

        if ( ! $product_id ) {
            return '';
        }

        // Check if product is already in cart and get its quantity + cart_item_key
        $in_cart = false;
        $cart_qty = 0;
        $cart_item_key = '';

        if ( WC()->cart ) {
            foreach ( WC()->cart->get_cart() as $key => $item ) {
                if ( $item['product_id'] == $product_id ) {
                    $in_cart = true;
                    $cart_qty = $item['quantity'];
                    $cart_item_key = $key;
                    break;
                }
            }
        }

        ob_start();
        ?>
        <div class="ccf-cart-form"
             data-product-id="<?php echo esc_attr( $product_id ); ?>"
             data-cart-key="<?php echo esc_attr( $cart_item_key ); ?>"
             data-in-cart="<?php echo $in_cart ? '1' : '0'; ?>">

            <?php if ( $in_cart ) : ?>
                <div class="ccf-qty-wrapper ccf-active">
                    <button type="button" class="ccf-btn ccf-minus" aria-label="Reducir cantidad">−</button>
                    <input type="number" class="ccf-qty-input" value="<?php echo esc_attr( $cart_qty ); ?>" min="0" readonly>
                    <button type="button" class="ccf-btn ccf-plus" aria-label="Aumentar cantidad">+</button>
                </div>
                <button type="button" class="ccf-remove" aria-label="Eliminar del carrito">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            <?php else : ?>
                <div class="ccf-qty-wrapper">
                    <button type="button" class="ccf-btn ccf-minus" aria-label="Reducir cantidad">−</button>
                    <input type="number" class="ccf-qty-input" value="0" min="0" readonly>
                    <button type="button" class="ccf-btn ccf-plus" aria-label="Aumentar cantidad">+</button>
                </div>
                <button type="button" class="ccf-remove" aria-label="Eliminar del carrito" style="display:none;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            <?php endif; ?>

        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * AJAX: Update cart item quantity.
     */
    public function ajax_update_qty() {
        check_ajax_referer( 'ccf_nonce', 'nonce' );

        $cart_key = sanitize_text_field( $_POST['cart_key'] ?? '' );
        $qty = (int) ( $_POST['qty'] ?? 0 );

        if ( ! $cart_key || $qty < 1 ) {
            wp_send_json_error( 'Datos inválidos' );
        }

        WC()->cart->set_quantity( $cart_key, $qty );

        wp_send_json_success( $this->get_cart_response() );
    }

    /**
     * AJAX: Remove item from cart.
     * Supports cart_key directly or fallback search by product_id.
     */
    public function ajax_remove_item() {
        check_ajax_referer( 'ccf_nonce', 'nonce' );

        $cart_key   = sanitize_text_field( $_POST['cart_key'] ?? '' );
        $product_id = (int) ( $_POST['product_id'] ?? 0 );
        $removed    = false;

        // Try removing by cart_key first
        if ( $cart_key && WC()->cart->get_cart_item( $cart_key ) ) {
            $removed = WC()->cart->remove_cart_item( $cart_key );
        }

        // Fallback: find by product_id
        if ( ! $removed && $product_id ) {
            foreach ( WC()->cart->get_cart() as $key => $item ) {
                if ( (int) $item['product_id'] === $product_id ) {
                    $removed = WC()->cart->remove_cart_item( $key );
                    break;
                }
            }
        }

        if ( ! $removed ) {
            wp_send_json_error( 'No se pudo eliminar el producto del carrito' );
        }

        wp_send_json_success( $this->get_cart_response() );
    }

    /**
     * AJAX: Add product to cart.
     */
    public function ajax_add_to_cart() {
        check_ajax_referer( 'ccf_nonce', 'nonce' );

        $product_id = (int) ( $_POST['product_id'] ?? 0 );
        $qty = (int) ( $_POST['qty'] ?? 1 );

        if ( ! $product_id || $qty < 1 ) {
            wp_send_json_error( 'Datos inválidos' );
        }

        $cart_item_key = WC()->cart->add_to_cart( $product_id, $qty );

        if ( ! $cart_item_key ) {
            wp_send_json_error( 'No se pudo agregar al carrito' );
        }

        $response = $this->get_cart_response();
        $response['cart_key'] = $cart_item_key;

        wp_send_json_success( $response );
    }

    /**
     * Build response with updated cart data + WC fragments for live price update.
     */
    private function get_cart_response() {
        WC()->cart->calculate_totals();

        // Get WC cart fragments (mini-cart, totals, etc.)
        ob_start();
        woocommerce_mini_cart();
        $mini_cart = ob_get_clean();

        $fragments = apply_filters( 'woocommerce_add_to_cart_fragments', [
            'div.widget_shopping_cart_content' => '<div class="widget_shopping_cart_content">' . $mini_cart . '</div>',
        ] );

        return [
            'cart_total'    => WC()->cart->get_cart_total(),
            'cart_count'    => WC()->cart->get_cart_contents_count(),
            'cart_subtotal' => WC()->cart->get_cart_subtotal(),
            'fragments'     => $fragments,
            'cart_hash'     => WC()->cart->get_cart_hash(),
        ];
    }
}

Custom_Cart_Form::instance();
