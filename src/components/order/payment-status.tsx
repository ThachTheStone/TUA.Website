import { PaymentPanel } from "@/components/order/payment-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { OrderView } from "@/lib/orders/queries";

/** QR while waiting for the transfer, otherwise a note on where the payment stands. */
export function PaymentStatus({ order }: { order: OrderView }) {
  if (order.payment) {
    return <PaymentPanel payment={order.payment} code={order.code} token={order.accessToken} />;
  }
  if (order.status === "PAYMENT_REVIEW") {
    return (
      <Alert>
        <AlertDescription>
          Cảm ơn bạn! Ban tổ chức đang đối soát khoản chuyển khoản và sẽ gửi email khi đơn được xác nhận.
        </AlertDescription>
      </Alert>
    );
  }
  if (order.overdue) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Đơn đã quá hạn thanh toán. Nếu bạn đã chuyển khoản, vui lòng liên hệ Ban tổ chức kèm mã đơn {order.code}.
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}
