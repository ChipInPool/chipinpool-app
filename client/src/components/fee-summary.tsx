export function FeeSummary() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            ChipInPool consumer fees in US dollars
          </caption>
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className="p-4">
                Action
              </th>
              <th scope="col" className="p-4">
                ChipInPool fee
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <th scope="row" className="p-4 font-medium">
                Create an account or join a pool
              </th>
              <td className="p-4">$0</td>
            </tr>
            <tr>
              <th scope="row" className="p-4 font-medium">
                Standard pool payout to a bank
              </th>
              <td className="p-4">$0</td>
            </tr>
            <tr>
              <th scope="row" className="p-4 font-medium">
                Instant pool payout, when available
              </th>
              <td className="p-4">1.5% of the payout amount</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="border-t border-border p-5 space-y-3 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">For a $100 pool payout:</strong>{" "}
          standard payout has a $0 ChipInPool fee and a $100 net amount. Instant
          payout has a $1.50 fee and a $98.50 net amount.
        </p>
        <p>
          Payout availability and timing depend on verification, the payment
          provider, and your bank. Check the amount, method, and any applicable
          charges before confirming. Merchant integration pricing is separate;
          contact us for your rate.
        </p>
      </div>
    </div>
  );
}
