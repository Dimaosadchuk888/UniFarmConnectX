import React from 'react';

const ReferralLevelsTable: React.FC = () => {
  // Static data for the table
  const levels = [
    { level: "Уровень 1", friends: 0, income: "0 UNI" },
    { level: "Уровень 2", friends: 0, income: "0 UNI" },
    { level: "Уровень 3", friends: 0, income: "0 UNI" },
  ];

  return (
    <div className="bg-card rounded-xl p-4 shadow-lg">
      <h2 className="text-md font-medium mb-3">Уровни партнерской программы</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-muted">
              <th className="py-2 text-left text-sm text-foreground opacity-70">Уровень</th>
              <th className="py-2 text-left text-sm text-foreground opacity-70">Друзей</th>
              <th className="py-2 text-left text-sm text-foreground opacity-70">Доход</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((item, index) => (
              <tr key={index} className={index < levels.length - 1 ? "border-b border-muted" : ""}>
                <td className="py-2 text-sm">{item.level}</td>
                <td className="py-2 text-sm">{item.friends}</td>
                <td className="py-2 text-sm text-accent">{item.income}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReferralLevelsTable;
