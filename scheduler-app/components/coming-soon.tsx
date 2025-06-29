import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Clock, TrendingUp } from "lucide-react"

export function ComingSoon() {
  return (
    <div className="flex items-center justify-center min-h-[70vh] p-4">
      <Card className="w-full max-w-lg shadow-sm border-border">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center items-center gap-2 mb-4">
            <BarChart3 className="w-8 h-8 text-primary" />
            <TrendingUp className="w-6 h-6 text-muted-foreground" />
            <Clock className="w-6 h-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl font-semibold text-foreground">
            Analytics Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-base text-muted-foreground leading-relaxed">
            We're building comprehensive insights for your pharmacy scheduling system.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">
              Coming Features:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Staff hour tracking and compliance monitoring</li>
              <li>• Weekly and monthly scheduling reports</li>
              <li>• Leave pattern analysis and insights</li>
              <li>• Schedule efficiency metrics</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            Focus on perfecting your schedule first — analytics will follow.
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 