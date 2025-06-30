import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { TrendingUp } from 'lucide-react';

interface ReferralLevel {
  level: number;
  commission: string;
  referrals: number;
  income: string;
}

const ReferralLevelsTable: React.FC = () => {
  const levels: ReferralLevel[] = Array.from({ length: 20 }, (_, i) => ({
    level: i + 1,
    commission: i === 0 ? '100%' : `${Math.max(20 - i, 2)}%`,
    referrals: 0,
    income: '0 UNI'
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          20-уровневая партнерская программа
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Уровень</th>
                <th className="text-left py-2">Комиссия</th>
                <th className="text-left py-2">Рефералов</th>
                <th className="text-left py-2">Доход</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((level) => (
                <tr key={level.level} className="border-b">
                  <td className="py-2">{level.level}</td>
                  <td className="py-2">{level.commission}</td>
                  <td className="py-2">{level.referrals}</td>
                  <td className="py-2">{level.income}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralLevelsTable;