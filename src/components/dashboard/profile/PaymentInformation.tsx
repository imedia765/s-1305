import { Profile } from "@/integrations/supabase/types/profile";
import { format } from "date-fns";

interface PaymentInformationProps {
  profile: Profile;
}

export const PaymentInformation = ({ profile }: PaymentInformationProps) => {
  if (!profile.payment_amount && !profile.payment_type && !profile.payment_date) return null;

  return (
    <>
      <div className="md:col-span-2 pt-4">
        <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
      </div>
      {profile.payment_amount && (
        <div>
          <p className="text-sm text-muted-foreground">Amount</p>
          <p className="font-medium">£{profile.payment_amount}</p>
        </div>
      )}
      {profile.payment_type && (
        <div>
          <p className="text-sm text-muted-foreground">Payment Type</p>
          <p className="font-medium capitalize">{profile.payment_type}</p>
        </div>
      )}
      {profile.payment_date && (
        <div>
          <p className="text-sm text-muted-foreground">Payment Date</p>
          <p className="font-medium">{format(new Date(profile.payment_date), 'PPP')}</p>
        </div>
      )}
      {profile.payment_notes && (
        <div className="md:col-span-2">
          <p className="text-sm text-muted-foreground">Payment Notes</p>
          <p className="font-medium">{profile.payment_notes}</p>
        </div>
      )}
    </>
  );
};