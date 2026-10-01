"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { OrderDetails } from "@/components/order/order-details";
import { PaymentPanel } from "@/components/order/payment-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lookupOrderAction } from "@/lib/orders/actions";
import { orderCodeSchema, phoneSchema } from "@/lib/orders/checkout-schema";
import type { OrderView } from "@/lib/orders/queries";

const schema = z.object({ code: orderCodeSchema, phone: phoneSchema });
type LookupInput = z.input<typeof schema>;
type LookupValues = z.output<typeof schema>;

/** FR11: look up an order with both its code and the phone number (NFR03). */
export function LookupForm() {
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<LookupValues | null>(null);
  const { register, handleSubmit, formState } = useForm<LookupInput, unknown, LookupValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: "", phone: "" },
  });

  async function onSubmit(values: LookupValues) {
    setError(null);
    setLast(values);
    const result = await lookupOrderAction(values);
    if (result.ok) setOrder(result.data);
    else {
      setOrder(null);
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">Mã đơn</Label>
          <Input id="code" placeholder="TUA0001" autoCapitalize="characters" className="placeholder:text-muted-foreground/70" {...register("code")} />
          {formState.errors.code && <p className="text-sm text-destructive">{formState.errors.code.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Số điện thoại đặt hàng</Label>
          <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" {...register("phone")} />
          {formState.errors.phone && <p className="text-sm text-destructive">{formState.errors.phone.message}</p>}
        </div>
        <Button type="submit" size="lg" className="h-11" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Search />} Tra cứu
        </Button>
      </form>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {order && (
        <div className="flex flex-col gap-8">
          {order.payment && (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">Thanh toán</h2>
              <PaymentPanel
                payment={order.payment}
                code={order.code}
                token={order.accessToken}
                onTransferred={() => last && onSubmit(last)}
              />
            </section>
          )}
          <OrderDetails order={order} />
        </div>
      )}
    </div>
  );
}
