import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function PaymentCallbackLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-slate-900 via-cyber-slate-800 to-cyber-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-glass-white-strong backdrop-blur-xl border border-white/20 shadow-cyber-card">
        <CardHeader className="text-center">
          <CardTitle className="text-white flex items-center justify-center gap-3 text-xl font-bold">
            <Loader2 className="w-6 h-6 text-brand-red-400 animate-spin" />
            Processing Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-cyber-slate-300 text-lg">Please wait while we verify your payment...</p>

          <div className="bg-glass-white p-4 rounded-2xl border border-white/10">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-brand-red-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-brand-red-400 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-brand-red-400 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
